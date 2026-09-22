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
