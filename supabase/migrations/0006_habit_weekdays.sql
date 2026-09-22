/*
  # Návyk jen ve vybrané dny v týdnu

  Klient si u návyku zvolí, kdy ho má dělat — každý den, jen pracovní dny,
  nebo libovolnou kombinaci.

  ## Nový stav dne: volno
  Den, na který nepřipadá žádný návyk, není „nevyplněno". Klient nic
  nezanedbal, prostě nic neměl. Kdyby se počítal jako nevyplněný, rozbil by
  sérii a ráno by na něj přišlo hlášení, že klient vynechal.

  ## Formát
  Čísla dnů podle ISO: 1 = pondělí … 7 = neděle. Stejně je čísluje
  `extract(isodow from date)`, takže se nikde nepřepočítává.
*/

alter table public.habits
  add column if not exists weekdays smallint[] not null
    default array[1, 2, 3, 4, 5, 6, 7]::smallint[];

/*
  `cardinality`, ne `array_length`: u prázdného pole vrací `array_length`
  hodnotu NULL, a CHECK propustí všechno, co není výslovně nepravda.
  Návyk bez jediného dne by tím pádem prošel a nešel by nikdy splnit.
  `cardinality` vrací poctivou nulu.
*/
alter table public.habits drop constraint if exists habits_weekdays_valid;
alter table public.habits add constraint habits_weekdays_valid check (
  cardinality(weekdays) between 1 and 7
  and weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
);

comment on column public.habits.weekdays is
  'Dny v týdnu, kdy návyk platí. ISO číslování: 1 = pondělí, 7 = neděle.';

-- Den volna je čtvrtý možný stav, do kterého ranní vyhodnocení den zařadí.
alter table public.day_summaries drop constraint if exists day_summaries_status_check;
alter table public.day_summaries add constraint day_summaries_status_check
  check (status in ('complete', 'incomplete', 'empty', 'rest'));

/*
  Zápis do dne, na který návyk nepřipadá, nedává smysl. Starší záznamy
  zůstávají — když klient rozvrh změní, historie se nepřepisuje.
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

  if tg_op = 'INSERT'
     and extract(isodow from new.entry_date)::smallint <> all (v_habit.weekdays) then
    raise exception 'Na tenhle den v týdnu návyk nepřipadá.';
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
