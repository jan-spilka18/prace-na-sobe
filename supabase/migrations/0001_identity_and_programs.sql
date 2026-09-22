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

drop trigger if exists profiles_touch_updated_at on public.profiles;
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
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/*
  Klient si nesmí přepsat roli. Politika WITH CHECK by to neuhlídala:
  kontroluje výslednou řádku, ale role je legitimní sloupec vlastního profilu.

  `auth.uid() is null` znamená, že požadavek nepřišel od přihlášeného
  uživatele přes API, ale ze serveru — z SQL Editoru, ze servisního klíče
  nebo z naplánované úlohy. Tyhle cesty mají plnou důvěru už tím, že se k nim
  dostane jen ten, kdo drží klíče k projektu.

  Bez téhle výjimky by nemohl vzniknout vůbec první admin: podmínka by
  vyžadovala admina, který ještě neexistuje. Přes API je to bezpečné —
  politika UPDATE pustí jen vlastníka profilu nebo admina, a vlastník
  s null uid neprojde ani tam.
*/
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Roli může měnit jen administrátor.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

alter table public.profiles enable row level security;

drop policy if exists "Profil čte vlastník nebo admin" on public.profiles;
create policy "Profil čte vlastník nebo admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Profil upravuje vlastník nebo admin" on public.profiles;
create policy "Profil upravuje vlastník nebo admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "Profil maže jen admin" on public.profiles;
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

create index if not exists programs_client_idx on public.programs (client_id, status);

-- Jeden běžící program na klienta. Dokončené a archivované se nepočítají,
-- takže historie zůstává a na nový program se dá plynule navázat.
create unique index if not exists programs_one_active_per_client
  on public.programs (client_id)
  where status = 'active';

drop trigger if exists programs_touch_updated_at on public.programs;
create trigger programs_touch_updated_at
  before update on public.programs
  for each row execute function public.touch_updated_at();

alter table public.programs enable row level security;

drop policy if exists "Program čte vlastník nebo admin" on public.programs;
create policy "Program čte vlastník nebo admin"
  on public.programs for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "Program zakládá jen admin" on public.programs;
create policy "Program zakládá jen admin"
  on public.programs for insert to authenticated
  with check (public.is_admin());

drop policy if exists "Program upravuje jen admin" on public.programs;
create policy "Program upravuje jen admin"
  on public.programs for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Program maže jen admin" on public.programs;
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

drop trigger if exists app_settings_touch_updated_at on public.app_settings;
create trigger app_settings_touch_updated_at
  before update on public.app_settings
  for each row execute function public.touch_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "Nastavení vidí jen admin" on public.app_settings;
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
