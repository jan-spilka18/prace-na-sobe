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
