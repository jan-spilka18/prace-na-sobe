/*
  ════════════════════════════════════════════════════════════════════════
  Práce na sobě — kompletní schéma databáze

  POZOR: tenhle soubor se nepíše ručně.
  Vzniká spojením všech migrací ze supabase/migrations/ příkazem:

      npm run build:schema

  Needituj ho přímo — uprav migraci a soubor přegeneruj.

  ── Jak ho použít ──────────────────────────────────────────────────────
  V Supabase otevři SQL Editor, vlož celý obsah a klikni Run.
  Projede najednou a skončí hláškou Success.
  ════════════════════════════════════════════════════════════════════════
*/


-- ═══════════════════════════════════════════════════════════════
-- 0001_identity_and_programs.sql
-- ═══════════════════════════════════════════════════════════════

/*
  # Identita, role a programy

  ## Co zavádí
  1. `profiles` — profil ke každému účtu v auth.users, nese roli (admin / client).
  2. `is_admin()` — SECURITY DEFINER helper. Bez něj by se RLS na `profiles`
     zacyklila: politika by potřebovala číst `profiles`, což by znovu spustilo
     politiku. SECURITY DEFINER běží mimo RLS, takže rekurze nevznikne.
  3. `programs` — program klienta. Délka je sloupec, ne konstanta, aby aplikace
     mohla obsloužit i jinou spolupráci než 90denní výzvu.
  4. `app_settings` — prahové hodnoty vzorců a další laditelné konstanty.

  ## Bezpečnost
  - RLS je zapnutá na všech tabulkách.
  - Klient vidí a mění jen svůj profil, admin vidí všechny.
  - Roli si klient nemůže povýšit — hlídá to trigger, ne jen politika.
  - Veřejná registrace se vypíná v nastavení Supabase projektu
    (Authentication → Sign In / Providers → Allow new users to sign up = off).
*/

-- ---------------------------------------------------------------------------
-- Pomocné funkce
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'client' check (role in ('admin', 'client')),
  full_name   text not null default '',
  email       text not null default '',
  timezone    text not null default 'Europe/Prague',
  -- Vyplní se, až klient projde úvodním návodem „Přidat na plochu".
  onboarded_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- SECURITY DEFINER: čte profiles mimo RLS, jinak by politiky rekurzivně volaly samy sebe.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Profil vzniká automaticky s účtem. Roli i jméno předává admin
-- v raw_user_meta_data při zakládání účtu přes service-role klíč.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'
      else 'client'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Klient si nesmí přepsat roli. Politika WITH CHECK by to neuhlídala:
-- kontroluje výslednou řádku, ale role je legitimní sloupec vlastního profilu.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Roli může měnit jen administrátor.';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;

create policy "Profil čte vlastník nebo admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "Profil upravuje vlastník nebo admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "Profil maže jen admin"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- INSERT politika chybí schválně: profily zakládá výhradně trigger
-- nad auth.users, který běží jako SECURITY DEFINER.

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------

create table if not exists public.programs (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.profiles(id) on delete cascade,
  kind          text not null default 'challenge',
  title         text not null default '90denní výzva',
  start_date    date not null,
  duration_days integer not null default 90 check (duration_days between 1 and 3650),
  status        text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index programs_client_idx on public.programs (client_id, status);

-- Jeden běžící program na klienta. Dokončené a archivované se nepočítají,
-- takže historie zůstává a na nový program se dá plynule navázat.
create unique index programs_one_active_per_client
  on public.programs (client_id)
  where status = 'active';

create trigger programs_touch_updated_at
  before update on public.programs
  for each row execute function public.touch_updated_at();

alter table public.programs enable row level security;

create policy "Program čte vlastník nebo admin"
  on public.programs for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "Program zakládá jen admin"
  on public.programs for insert to authenticated
  with check (public.is_admin());

create policy "Program upravuje jen admin"
  on public.programs for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Program maže jen admin"
  on public.programs for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- app_settings
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger app_settings_touch_updated_at
  before update on public.app_settings
  for each row execute function public.touch_updated_at();

alter table public.app_settings enable row level security;

create policy "Nastavení vidí jen admin"
  on public.app_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.app_settings (key, value) values
  (
    'patterns',
    jsonb_build_object(
      'consecutive_missed_days', 3,
      'repeated_habit_misses', jsonb_build_object('count', 3, 'window_days', 7)
    )
  )
on conflict (key) do nothing;

-- ═══════════════════════════════════════════════════════════════
-- 0002_habits.sql
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- 0003_sessions_and_private_notes.sql
-- ═══════════════════════════════════════════════════════════════

/*
  # Sezení, zpětná vazba a soukromý prostor kouče

  ## Klíčová rozhodnutí
  1. **Obsah zápisu je `jsonb`, ne sloupce.** Struktura se bude ladit; seznam
     sekcí žije v `src/lib/sessionTemplate.ts`. Přidání sekce je tím pádem
     úprava jednoho pole, ne migrace.
  2. **`program_id` je nepovinné.** Sezení může proběhnout i mimo výzvu.
  3. **`external_source` + `external_id` už teď.** Etapa 2 má přijímat zápisy
     z nahrávací aplikace přes webhook; idempotence na tom stojí a doplňovat
     ji zpětně do živých dat je nepříjemné.
  4. **Koncept je pro klienta neviditelný na úrovni databáze**, ne jen v UI.

  ## Bezpečnost
  `session_preps`, `client_notes` a `client_links` jsou pro klienta nedostupné
  i přes přímé volání API — jejich politika se ptá výhradně na `is_admin()`.
*/

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------

create table if not exists public.sessions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  program_id      uuid references public.programs(id) on delete set null,
  session_date    date not null,
  kind            text not null check (kind in ('coaching', 'breathwork')),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  content         jsonb not null default '{}'::jsonb,
  published_at    timestamptz,
  external_source text,
  external_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint published_has_timestamp
    check (status <> 'published' or published_at is not null)
);

create index sessions_client_idx on public.sessions (client_id, session_date desc);

-- Ochrana proti dvojímu doručení stejného zápisu z externí aplikace.
create unique index sessions_external_ref_idx
  on public.sessions (external_source, external_id)
  where external_source is not null and external_id is not null;

create trigger sessions_touch_updated_at
  before update on public.sessions
  for each row execute function public.touch_updated_at();

create or replace function public.sessions_set_published_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  elsif new.status = 'draft' then
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger sessions_set_published_at
  before insert or update on public.sessions
  for each row execute function public.sessions_set_published_at();

alter table public.sessions enable row level security;

create policy "Klient čte jen publikovaná sezení, admin všechna"
  on public.sessions for select to authenticated
  using (
    public.is_admin()
    or (client_id = auth.uid() and status = 'published')
  );

create policy "Sezení spravuje jen admin"
  on public.sessions for insert to authenticated
  with check (public.is_admin());

create policy "Sezení upravuje jen admin"
  on public.sessions for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Sezení maže jen admin"
  on public.sessions for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- session_feedback — dvě pole, nic víc
-- ---------------------------------------------------------------------------

create table if not exists public.session_feedback (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  feeling    text not null default '',
  takeaway   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger session_feedback_touch_updated_at
  before update on public.session_feedback
  for each row execute function public.touch_updated_at();

create or replace function public.session_feedback_set_client()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  select client_id into new.client_id
  from public.sessions where id = new.session_id;

  if new.client_id is null then
    raise exception 'Sezení % neexistuje.', new.session_id;
  end if;

  return new;
end;
$$;

create trigger session_feedback_set_client
  before insert or update of session_id on public.session_feedback
  for each row execute function public.session_feedback_set_client();

alter table public.session_feedback enable row level security;

create policy "Zpětnou vazbu čte autor nebo admin"
  on public.session_feedback for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

create policy "Zpětnou vazbu píše klient k publikovanému sezení"
  on public.session_feedback for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.sessions s
      where s.id = session_id
        and s.client_id = auth.uid()
        and s.status = 'published'
    )
  );

create policy "Zpětnou vazbu upravuje autor nebo admin"
  on public.session_feedback for update to authenticated
  using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

create policy "Zpětnou vazbu maže autor nebo admin"
  on public.session_feedback for delete to authenticated
  using (client_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Soukromý prostor kouče — klient se k těmto tabulkám nedostane
-- ---------------------------------------------------------------------------

create table if not exists public.session_preps (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  content    text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index session_preps_session_idx on public.session_preps (session_id);

create trigger session_preps_touch_updated_at
  before update on public.session_preps
  for each row execute function public.touch_updated_at();

alter table public.session_preps enable row level security;

create policy "Přípravy jsou jen pro admina"
  on public.session_preps for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.client_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

create trigger client_notes_touch_updated_at
  before update on public.client_notes
  for each row execute function public.touch_updated_at();

alter table public.client_notes enable row level security;

create policy "Soukromé poznámky jsou jen pro admina"
  on public.client_notes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.client_links (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  url        text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index client_links_client_idx on public.client_links (client_id, position);

create trigger client_links_touch_updated_at
  before update on public.client_links
  for each row execute function public.touch_updated_at();

alter table public.client_links enable row level security;

create policy "Odkazy jsou jen pro admina"
  on public.client_links for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════
-- 0004_notifications.sql
-- ═══════════════════════════════════════════════════════════════

/*
  # Push odběry, nastavení kanálů a log odeslaného

  ## Klíčová rozhodnutí
  1. **`notification_log.dedupe_key` je UNIQUE.** Cron pro připomínky běží
     každých pár minut a ranní souhrn se může při výpadku spustit znovu.
     Unikátní klíč je jediná spolehlivá pojistka proti dvojímu odeslání —
     kontrola v aplikaci ji neuhlídá, protože dva běhy mohou přijít naráz.
  2. **Odběr patří zařízení, ne uživateli.** Honza si appku přidá na telefon
     i iPad; každé zařízení má vlastní endpoint.
  3. **`failed_at` místo mazání.** Když push neprojde, odběr se označí.
     Zmizí až po opakovaném selhání, aby jeden výpadek sítě neodhlásil telefon.
*/

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  failed_at    timestamptz,
  fail_count   integer not null default 0
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Odběr spravuje jeho vlastník"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notification_settings
-- ---------------------------------------------------------------------------

create table if not exists public.notification_settings (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  push_enabled      boolean not null default true,
  email_enabled     boolean not null default true,
  -- Uzávěrka dne. Mění se jen adminovi, klienta se netýká.
  daily_summary_time time not null default '08:00',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger notification_settings_touch_updated_at
  before update on public.notification_settings
  for each row execute function public.touch_updated_at();

alter table public.notification_settings enable row level security;

create policy "Nastavení notifikací spravuje jeho vlastník"
  on public.notification_settings for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Řádek vzniká s profilem, aby se v aplikaci nemuselo řešit, že chybí.
create or replace function public.create_notification_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_create_notification_settings
  after insert on public.profiles
  for each row execute function public.create_notification_settings();

-- ---------------------------------------------------------------------------
-- notification_log
-- ---------------------------------------------------------------------------

create table if not exists public.notification_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  kind       text not null check (kind in ('habit_reminder', 'daily_summary', 'pattern_alert')),
  channel    text not null check (channel in ('push', 'email')),
  -- Např. reminder:<habit_id>:2026-09-22 nebo summary:<admin_id>:<client_id>:2026-09-22
  dedupe_key text not null unique,
  payload    jsonb not null default '{}'::jsonb,
  sent_at    timestamptz not null default now()
);

create index notification_log_user_idx on public.notification_log (user_id, sent_at desc);

alter table public.notification_log enable row level security;

create policy "Log notifikací vidí jen admin"
  on public.notification_log for select to authenticated
  using (public.is_admin());

-- Zapisuje výhradně naplánovaná úloha přes service-role klíč.
