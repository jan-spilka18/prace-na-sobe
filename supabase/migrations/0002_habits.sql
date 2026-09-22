/*
  # Návyky, verzované cíle, denní záznamy

  ## Klíčová rozhodnutí
  1. **Cíl je časová řada, ne sloupec.** `habit_targets` drží dvojici
     (hodnota, platí od). Cíl pro den D je poslední řádek s `effective_from <= D`.
     Změna cíle tak sama od sebe platí jen do budoucna a starší dny si drží
     původní hodnotu — bez zvláštní logiky v aplikaci.
  2. **„Nevyplněno" = řádek neexistuje.** Stav dne má tři hodnoty, ale sloupec
     jen dvě. Do třetího stavu se tím pádem nedá omylem zapsat.
  3. **`backfilled` a `target_snapshot` plní trigger, ne klient.** Kdyby je
     posílal prohlížeč, dal by se čas vyplnění i cíl zfalšovat.
  4. **Návyk se needituje destruktivně.** Smazat jde jen návyk bez záznamů;
     jinak se archivuje, aby historie dávala smysl.
*/

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------

create table if not exists public.habits (
  id               uuid primary key default gen_random_uuid(),
  program_id       uuid not null references public.programs(id) on delete cascade,
  -- Denormalizace kvůli RLS: bez ní by každá politika musela joinovat programs.
  client_id        uuid not null references public.profiles(id) on delete cascade,
  title            text not null check (length(trim(title)) > 0),
  description      text,
  link_url         text,
  type             text not null check (type in ('boolean', 'minutes', 'reps')),
  position         integer not null default 0,
  archived_at      timestamptz,
  reminder_enabled boolean not null default false,
  -- Lokální čas v pásmu klienta, ne UTC. Připomínka v 7:00 má zůstat v 7:00
  -- i po přechodu na letní čas.
  reminder_time    time,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint reminder_needs_time
    check (not reminder_enabled or reminder_time is not null)
);

create index habits_program_idx on public.habits (program_id, position);
create index habits_client_idx on public.habits (client_id) where archived_at is null;
-- Podpora pro cron, který každých pár minut hledá návyky s připomínkou.
create index habits_reminder_idx on public.habits (reminder_time)
  where reminder_enabled and archived_at is null;

create trigger habits_touch_updated_at
  before update on public.habits
  for each row execute function public.touch_updated_at();

-- client_id musí vždy odpovídat vlastníkovi programu, jinak by se dal návyk
-- podstrčit do cizího programu.
create or replace function public.habits_set_client()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select client_id into new.client_id
  from public.programs where id = new.program_id;

  if new.client_id is null then
    raise exception 'Program % neexistuje.', new.program_id;
  end if;

  return new;
end;
$$;

create trigger habits_set_client
  before insert or update of program_id on public.habits
  for each row execute function public.habits_set_client();

/*
  Brání smazat návyk, který už má historii — jinak by se ztratily vyplněné dny.

  `pg_trigger_depth() > 1` znamená, že nejde o přímé smazání, ale o kaskádu:
  maže se celý program nebo celý klient (GDPR). Tam je odstranění návyků
  žádoucí, takže se ochrana neuplatní. Bez této podmínky by smazání klienta
  selhalo na jeho vlastních záznamech.
*/
create or replace function public.habits_block_delete_with_history()
returns trigger
language plpgsql
as $$
begin
  if pg_trigger_depth() > 1 then
    return old;
  end if;

  if exists (select 1 from public.habit_entries where habit_id = old.id) then
    raise exception 'Návyk už má vyplněné dny, smazat nejde. Archivuj ho.'
      using hint = 'Nastav archived_at místo mazání.';
  end if;

  return old;
end;
$$;

alter table public.habits enable row level security;

create policy "Návyk čte vlastník nebo admin"
  on public.habits for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "Návyk zakládá vlastník programu nebo admin"
  on public.habits for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.programs p
      where p.id = program_id and p.client_id = auth.uid() and p.status = 'active'
    )
  );

create policy "Návyk upravuje vlastník nebo admin"
  on public.habits for update to authenticated
  using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

create policy "Návyk maže vlastník nebo admin"
  on public.habits for delete to authenticated
  using (client_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- habit_targets
-- ---------------------------------------------------------------------------

create table if not exists public.habit_targets (
  id             uuid primary key default gen_random_uuid(),
  habit_id       uuid not null references public.habits(id) on delete cascade,
  target_value   integer not null check (target_value > 0),
  effective_from date not null,
  created_at     timestamptz not null default now(),

  unique (habit_id, effective_from)
);

create index habit_targets_lookup_idx
  on public.habit_targets (habit_id, effective_from desc);

-- Cíl platný pro daný den.
create or replace function public.habit_target_on(p_habit_id uuid, p_date date)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select target_value
  from public.habit_targets
  where habit_id = p_habit_id and effective_from <= p_date
  order by effective_from desc
  limit 1;
$$;

grant execute on function public.habit_target_on(uuid, date) to authenticated;

alter table public.habit_targets enable row level security;

create policy "Cíl čte vlastník návyku nebo admin"
  on public.habit_targets for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.habits h
      where h.id = habit_id and h.client_id = auth.uid()
    )
  );

create policy "Cíl zapisuje vlastník návyku nebo admin"
  on public.habit_targets for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.habits h
      where h.id = habit_id and h.client_id = auth.uid()
    )
  );

create policy "Cíl upravuje vlastník návyku nebo admin"
  on public.habit_targets for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.habits h
      where h.id = habit_id and h.client_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.habits h
      where h.id = habit_id and h.client_id = auth.uid()
    )
  );

create policy "Cíl maže vlastník návyku nebo admin"
  on public.habit_targets for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.habits h
      where h.id = habit_id and h.client_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- habit_entries
-- ---------------------------------------------------------------------------

create table if not exists public.habit_entries (
  id              uuid primary key default gen_random_uuid(),
  habit_id        uuid not null references public.habits(id) on delete cascade,
  client_id       uuid not null references public.profiles(id) on delete cascade,
  entry_date      date not null,
  status          text not null check (status in ('done', 'missed')),
  actual_value    integer check (actual_value >= 0),
  -- Cíl platný v den záznamu. Zamrzne tu, aby pozdější změna cíle
  -- nepřepsala minulost.
  target_snapshot integer,
  note            text,
  -- Doplněno zpětně: ranní souhrn o takových záznamech nenotifikuje.
  backfilled      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (habit_id, entry_date)
);

create index habit_entries_client_date_idx
  on public.habit_entries (client_id, entry_date desc);

create trigger habit_entries_touch_updated_at
  before update on public.habit_entries
  for each row execute function public.touch_updated_at();

/*
  Doplní odvozená pole a ohlídá rozsah programu.

  Proč trigger a ne generovaný sloupec: `backfilled` závisí na `now()` v pásmu
  Europe/Prague, což není IMMUTABLE výraz a generovaný sloupec ho nepřijme.
*/
create or replace function public.habit_entries_fill_derived()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_habit   public.habits%rowtype;
  v_program public.programs%rowtype;
  v_today   date := (now() at time zone 'Europe/Prague')::date;
begin
  select * into v_habit from public.habits where id = new.habit_id;
  if not found then
    raise exception 'Návyk % neexistuje.', new.habit_id;
  end if;

  select * into v_program from public.programs where id = v_habit.program_id;

  if new.entry_date > v_today then
    raise exception 'Budoucí den vyplnit nejde.';
  end if;

  if new.entry_date < v_program.start_date
     or new.entry_date > v_program.start_date + (v_program.duration_days - 1) then
    raise exception 'Den % je mimo rozsah programu.', new.entry_date;
  end if;

  new.client_id := v_habit.client_id;

  if new.status = 'missed' then
    new.actual_value := null;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.backfilled := new.entry_date < v_today;
    new.target_snapshot := public.habit_target_on(new.habit_id, new.entry_date);
  else
    -- Pozdější úprava záznamu nemění to, kdy vznikl ani jaký byl tehdy cíl.
    new.created_at := old.created_at;
    new.backfilled := old.backfilled;
    new.target_snapshot := old.target_snapshot;
  end if;

  return new;
end;
$$;

create trigger habit_entries_fill_derived
  before insert or update on public.habit_entries
  for each row execute function public.habit_entries_fill_derived();

-- Musí vzniknout až po habit_entries, protože se na ni odkazuje.
create trigger habits_block_delete_with_history
  before delete on public.habits
  for each row execute function public.habits_block_delete_with_history();

alter table public.habit_entries enable row level security;

create policy "Záznam čte vlastník nebo admin"
  on public.habit_entries for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "Záznam zapisuje vlastník nebo admin"
  on public.habit_entries for insert to authenticated
  with check (client_id = auth.uid() or public.is_admin());

create policy "Záznam upravuje vlastník nebo admin"
  on public.habit_entries for update to authenticated
  using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

create policy "Záznam maže vlastník nebo admin"
  on public.habit_entries for delete to authenticated
  using (client_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- day_summaries — výsledek ranního vyhodnocení
-- ---------------------------------------------------------------------------

create table if not exists public.day_summaries (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.profiles(id) on delete cascade,
  program_id   uuid not null references public.programs(id) on delete cascade,
  day_date     date not null,
  status       text not null check (status in ('complete', 'incomplete', 'empty')),
  evaluated_at timestamptz not null default now(),
  notified_at  timestamptz,

  unique (client_id, day_date)
);

create index day_summaries_client_idx on public.day_summaries (client_id, day_date desc);

alter table public.day_summaries enable row level security;

create policy "Souhrn dne čte vlastník nebo admin"
  on public.day_summaries for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

-- Zápis dělá výhradně naplánovaná úloha přes service-role klíč,
-- proto tu žádná INSERT ani UPDATE politika není.
