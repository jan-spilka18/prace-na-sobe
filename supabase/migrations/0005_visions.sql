/*
  # Vize klienta

  Volný text, který si klient napíše sám a čte ho každý den. Obsah je čistě
  na něm — mantra, důvod, cíl, cokoli mu drží směr.

  ## Proč vlastní tabulka a ne sloupec v `programs`
  Vizi musí umět přepsat klient, ale `programs` smí měnit jen admin.
  Povolit klientovi jediný sloupec by znamenalo sahat na sloupcová
  oprávnění, protože Row Level Security pracuje s řádky, ne se sloupci.
  Samostatná tabulka je čitelnější a nechá politiku programu být.

  ## Proč je vázaná na program, ne na klienta
  S novým programem přichází nový záměr. Stará vize zůstane u starého
  programu, takže se dá zpětně přečíst, s čím klient do výzvy šel.
*/

create table if not exists public.visions (
  id         uuid primary key default gen_random_uuid(),
  program_id uuid not null unique references public.programs(id) on delete cascade,
  -- Denormalizace kvůli RLS: bez ní by politika musela joinovat programs.
  client_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visions_client_idx on public.visions (client_id);

drop trigger if exists visions_touch_updated_at on public.visions;
create trigger visions_touch_updated_at
  before update on public.visions
  for each row execute function public.touch_updated_at();

-- client_id vždy podle vlastníka programu, aby se vize nedala podstrčit cizímu.
create or replace function public.visions_set_client()
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

drop trigger if exists visions_set_client on public.visions;
create trigger visions_set_client
  before insert or update of program_id on public.visions
  for each row execute function public.visions_set_client();

alter table public.visions enable row level security;

drop policy if exists "Vizi čte vlastník nebo admin" on public.visions;
create policy "Vizi čte vlastník nebo admin"
  on public.visions for select to authenticated
  using (client_id = auth.uid() or public.is_admin());

drop policy if exists "Vizi zakládá vlastník programu nebo admin" on public.visions;
create policy "Vizi zakládá vlastník programu nebo admin"
  on public.visions for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.programs p
      where p.id = program_id and p.client_id = auth.uid()
    )
  );

drop policy if exists "Vizi upravuje vlastník nebo admin" on public.visions;
create policy "Vizi upravuje vlastník nebo admin"
  on public.visions for update to authenticated
  using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

drop policy if exists "Vizi maže vlastník nebo admin" on public.visions;
create policy "Vizi maže vlastník nebo admin"
  on public.visions for delete to authenticated
  using (client_id = auth.uid() or public.is_admin());
