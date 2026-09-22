\set ON_ERROR_STOP on
\timing off

-- Pomůcka: přepne session na konkrétního přihlášeného uživatele.
create or replace function pg_temp.login(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_id::text, false);
  execute 'set role authenticated';
end $$;

create or replace function pg_temp.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claim.sub', '', false);
end $$;

-- Očekává, že výraz selže. Vrací popis výsledku.
create or replace function pg_temp.must_fail(p_sql text, p_label text) returns text language plpgsql as $$
begin
  execute p_sql;
  return format('SELHALO: %s — operace prošla, ačkoli neměla', p_label);
exception when others then
  return format('ok: %s (%s)', p_label, left(sqlerrm, 60));
end $$;

create or replace function pg_temp.check_eq(p_actual anyelement, p_expected anyelement, p_label text) returns text language plpgsql as $$
begin
  if p_actual is not distinct from p_expected then
    return format('ok: %s = %s', p_label, p_actual);
  end if;
  return format('SELHALO: %s — čekal %s, dostal %s', p_label, p_expected, p_actual);
end $$;

-- ---------------------------------------------------------------------------
-- Příprava dat (jako service-role, tedy mimo RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'honza@example.com',
   '{"full_name":"Honza","role":"admin"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'klient-a@example.com',
   '{"full_name":"Klient A"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'klient-b@example.com',
   '{"full_name":"Klient B"}'::jsonb);

\echo '=== Profily vznikly automaticky ==='
select pg_temp.check_eq((select count(*)::int from public.profiles), 3, 'počet profilů');
select pg_temp.check_eq((select role from public.profiles where email = 'honza@example.com'), 'admin', 'role Honzy');
select pg_temp.check_eq((select role from public.profiles where email = 'klient-a@example.com'), 'client', 'role klienta A');
select pg_temp.check_eq((select count(*)::int from public.notification_settings), 3, 'nastavení notifikací');

-- Programy a návyky zakládá admin
insert into public.programs (id, client_id, start_date, duration_days) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', current_date - 5, 90),
  ('aaaaaaaa-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', current_date - 5, 90);

insert into public.habits (id, program_id, client_id, title, type, position) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'Meditace + vizualizace', 'minutes', 1),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000', 'Kliky', 'reps', 2),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000', 'Ranní chůze', 'boolean', 1);

\echo '=== Trigger přepsal podstrčené client_id ==='
select pg_temp.check_eq(
  (select client_id from public.habits where id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  '22222222-2222-2222-2222-222222222222'::uuid, 'client_id návyku podle programu');

insert into public.habit_targets (habit_id, target_value, effective_from) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 15, current_date - 5),
  ('bbbbbbbb-0000-0000-0000-000000000002', 50, current_date - 5);

insert into public.sessions (id, client_id, session_date, kind, status) values
  ('cccccccc-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   current_date - 3, 'coaching', 'published'),
  ('cccccccc-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   current_date - 1, 'breathwork', 'draft');

insert into public.session_preps (session_id, content)
  values ('cccccccc-0000-0000-0000-000000000001', 'Soukromá příprava kouče');
insert into public.client_notes (client_id, body)
  values ('22222222-2222-2222-2222-222222222222', 'Soukromá poznámka');
insert into public.client_links (client_id, title, url)
  values ('22222222-2222-2222-2222-222222222222', 'Nahrávka', 'https://example.com');

-- ---------------------------------------------------------------------------
\echo ''
\echo '=== KLIENT A: co vidí ==='
select pg_temp.login('22222222-2222-2222-2222-222222222222');

select pg_temp.check_eq((select count(*)::int from public.profiles), 1, 'vidí jen svůj profil');
select pg_temp.check_eq((select count(*)::int from public.programs), 1, 'vidí jen svůj program');
select pg_temp.check_eq((select count(*)::int from public.habits), 2, 'vidí jen své návyky');
select pg_temp.check_eq((select count(*)::int from public.habit_targets), 2, 'vidí jen své cíle');

\echo '--- Soukromý prostor kouče musí být prázdný ---'
select pg_temp.check_eq((select count(*)::int from public.session_preps), 0, 'přípravy');
select pg_temp.check_eq((select count(*)::int from public.client_notes), 0, 'soukromé poznámky');
select pg_temp.check_eq((select count(*)::int from public.client_links), 0, 'odkazy');
select pg_temp.check_eq((select count(*)::int from public.app_settings), 0, 'nastavení aplikace');
select pg_temp.check_eq((select count(*)::int from public.notification_log), 0, 'log notifikací');

\echo '--- Koncept sezení je neviditelný ---'
select pg_temp.check_eq((select count(*)::int from public.sessions), 1, 'vidí jen publikované sezení');
select pg_temp.check_eq((select status from public.sessions), 'published', 'stav viditelného sezení');

\echo ''
\echo '=== KLIENT A: co nesmí ==='
select pg_temp.must_fail(
  $$update public.profiles set role = 'admin' where id = auth.uid()$$,
  'povýšit se na admina');
select pg_temp.must_fail(
  $$insert into public.programs (client_id, start_date) values (auth.uid(), current_date)$$,
  'založit si vlastní program');
select pg_temp.must_fail(
  $$insert into public.habit_entries (habit_id, client_id, entry_date, status)
    values ('bbbbbbbb-0000-0000-0000-000000000003', auth.uid(), current_date, 'done')$$,
  'zapsat do cizího návyku');
select pg_temp.must_fail(
  $$insert into public.habit_entries (habit_id, client_id, entry_date, status)
    values ('bbbbbbbb-0000-0000-0000-000000000001', auth.uid(), current_date + 1, 'done')$$,
  'vyplnit budoucí den');
select pg_temp.must_fail(
  $$insert into public.habit_entries (habit_id, client_id, entry_date, status)
    values ('bbbbbbbb-0000-0000-0000-000000000001', auth.uid(), current_date - 30, 'done')$$,
  'vyplnit den před začátkem programu');
select pg_temp.must_fail(
  $$insert into public.session_feedback (session_id, client_id, feeling, takeaway)
    values ('cccccccc-0000-0000-0000-000000000002', auth.uid(), 'x', 'y')$$,
  'komentovat nepublikované sezení');

\echo ''
\echo '=== KLIENT A: co smí ==='
insert into public.habit_entries (habit_id, client_id, entry_date, status, actual_value, note)
  values ('bbbbbbbb-0000-0000-0000-000000000001', auth.uid(), current_date, 'done', 20, 'Šlo to lehce');
insert into public.habit_entries (habit_id, client_id, entry_date, status, actual_value)
  values ('bbbbbbbb-0000-0000-0000-000000000002', auth.uid(), current_date - 2, 'done', 62);

select pg_temp.check_eq(
  (select backfilled from public.habit_entries where entry_date = current_date),
  false, 'dnešní záznam není zpětný');
select pg_temp.check_eq(
  (select backfilled from public.habit_entries where entry_date = current_date - 2),
  true, 'záznam dva dny zpět je zpětný');
select pg_temp.check_eq(
  (select target_snapshot from public.habit_entries where entry_date = current_date - 2),
  50, 'zamrzlý cíl u kliků');

\echo '--- Vlastní návyk smí klient upravit i přidat ---'
update public.habits set title = 'Kliky ráno' where id = 'bbbbbbbb-0000-0000-0000-000000000002';
insert into public.habits (program_id, client_id, title, type, position)
  values ('aaaaaaaa-0000-0000-0000-000000000001',
          '00000000-0000-0000-0000-000000000000', 'Čtení 20 stran', 'boolean', 3);
select pg_temp.check_eq((select count(*)::int from public.habits), 3, 'po přidání čtvrtého návyku');

\echo '--- Zpětná vazba k publikovanému sezení ---'
insert into public.session_feedback (session_id, client_id, feeling, takeaway)
  values ('cccccccc-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
          'Klid', 'Dýchat pomaleji');
select pg_temp.check_eq(
  (select client_id from public.session_feedback),
  '22222222-2222-2222-2222-222222222222'::uuid, 'client_id zpětné vazby doplnil trigger');

\echo ''
\echo '=== Změna cíle platí jen do budoucna ==='
insert into public.habit_targets (habit_id, target_value, effective_from)
  values ('bbbbbbbb-0000-0000-0000-000000000002', 80, current_date);
select pg_temp.check_eq(
  public.habit_target_on('bbbbbbbb-0000-0000-0000-000000000002', current_date - 2),
  50, 'cíl před dvěma dny');
select pg_temp.check_eq(
  public.habit_target_on('bbbbbbbb-0000-0000-0000-000000000002', current_date),
  80, 'cíl dnes');
select pg_temp.check_eq(
  (select target_snapshot from public.habit_entries where entry_date = current_date - 2),
  50, 'starý záznam si drží původní cíl');

\echo ''
\echo '=== Návyk s historií nejde smazat, návyk bez historie ano ==='
select pg_temp.must_fail(
  $$delete from public.habits where id = 'bbbbbbbb-0000-0000-0000-000000000002'$$,
  'smazat návyk s vyplněnými dny');
delete from public.habits where title = 'Čtení 20 stran';
select pg_temp.check_eq((select count(*)::int from public.habits), 2, 'po smazání návyku bez historie');

\echo ''
\echo '=== KLIENT B: nevidí data klienta A ==='
select pg_temp.login('33333333-3333-3333-3333-333333333333');
select pg_temp.check_eq((select count(*)::int from public.habit_entries), 0, 'cizí záznamy');
select pg_temp.check_eq((select count(*)::int from public.sessions), 0, 'cizí sezení');
select pg_temp.check_eq((select count(*)::int from public.session_feedback), 0, 'cizí zpětná vazba');

-- UPDATE na neviditelné řádky nevyhodí chybu, jen nic nezmění.
-- Kontroluje se proto počet zasažených řádků, ne výjimka.
do $$
declare v_count int;
begin
  update public.habit_entries set status = 'missed' where entry_date = current_date;
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'SELHALO: klient B přepsal % cizích záznamů', v_count;
  end if;
  raise notice 'ok: přepsat cizí záznam = 0 zasažených řádků';
end $$;

\echo ''
\echo '=== ADMIN: vidí všechno ==='
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select pg_temp.check_eq((select count(*)::int from public.profiles), 3, 'všechny profily');
select pg_temp.check_eq((select count(*)::int from public.programs), 2, 'všechny programy');
select pg_temp.check_eq((select count(*)::int from public.sessions), 2, 'koncept i publikované');
select pg_temp.check_eq((select count(*)::int from public.session_preps), 1, 'přípravy');
select pg_temp.check_eq((select count(*)::int from public.client_notes), 1, 'soukromé poznámky');
select pg_temp.check_eq((select count(*)::int from public.app_settings), 1, 'nastavení aplikace');
select pg_temp.check_eq(
  (select (value -> 'consecutive_missed_days')::int from public.app_settings where key = 'patterns'),
  3, 'práh po sobě jdoucích dní');

\echo '--- Admin vidí cíl i skutečnou hodnotu ---'
select habit_id, entry_date, status, target_snapshot, actual_value, backfilled, note
from public.habit_entries order by entry_date;

\echo ''
\echo '=== GDPR: smazání klienta odstraní všechna jeho data ==='
select pg_temp.logout();
delete from auth.users where id = '22222222-2222-2222-2222-222222222222';
select pg_temp.check_eq((select count(*)::int from public.profiles), 2, 'zbylé profily');
select pg_temp.check_eq((select count(*)::int from public.habits), 1, 'zbylé návyky');
select pg_temp.check_eq((select count(*)::int from public.habit_entries), 0, 'zbylé záznamy');
select pg_temp.check_eq((select count(*)::int from public.sessions), 0, 'zbylá sezení');
select pg_temp.check_eq((select count(*)::int from public.session_preps), 0, 'zbylé přípravy');
select pg_temp.check_eq((select count(*)::int from public.client_notes), 0, 'zbylé poznámky');
select pg_temp.check_eq((select count(*)::int from public.notification_settings), 2, 'zbylá nastavení');
