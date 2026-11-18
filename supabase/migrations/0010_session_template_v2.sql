/*
  # Zápis ze sezení podle Honzovy šablony

  ## Nové typy sezení
  Šablona zná čtyři typy: Koučink, Dech, Reflexe měsíce a Předzápasový
  hovor. Omezení na sloupci se přepíše, aby pustilo i ty dva nové.

  ## Poznámka pro Honzu
  Zápis končí částí „POZNÁMKA PRO HONZU (neposílat)" — věci k ověření
  a citlivá místa, která se klientovi neposílají. Do `sessions.content`
  patřit nesmí: ten klient čte. Ukládá se proto do vlastní tabulky, kterou
  politika pustí jen adminovi, stejně jako přípravy na sezení.

  Jedna poznámka na sezení (session_id je primární klíč), smaže se se
  sezením.

  Opakované spuštění nic nerozbije.
*/

alter table public.sessions drop constraint if exists sessions_kind_check;
alter table public.sessions
  add constraint sessions_kind_check
  check (kind in ('coaching', 'breathwork', 'monthly_review', 'pregame'));

create table if not exists public.session_coach_notes (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  note       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists session_coach_notes_touch_updated_at on public.session_coach_notes;
create trigger session_coach_notes_touch_updated_at
  before update on public.session_coach_notes
  for each row execute function public.touch_updated_at();

alter table public.session_coach_notes enable row level security;

drop policy if exists "Poznámky ke sezení jsou jen pro admina" on public.session_coach_notes;
create policy "Poznámky ke sezení jsou jen pro admina"
  on public.session_coach_notes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
