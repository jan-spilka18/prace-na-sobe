/*
  # E-mail a telefon mění jen admin

  Přihlašovací údaje a telefon klienta spravuje Honza. Klient je v aplikaci
  vidí, ale změnit je nemůže — formulář v Nastavení je nenabízí a databáze
  to nepustí ani přímým voláním API s klientovým přihlášením.

  Hlídá to tentýž trigger, který už chrání roli, jen o dva sloupce víc.
  Pravidla jsou stejná: `auth.uid() is null` znamená server (servisní klíč,
  SQL Editor), ten má plnou důvěru — přes něj e-mail mění admin, protože
  musí zároveň změnit i přihlašovací e-mail v Supabase Auth.

  Opakované spuštění nic nerozbije: funkce se jen přepíše.
*/

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Roli může měnit jen administrátor.';
  end if;
  if new.email is distinct from old.email then
    raise exception 'E-mail může měnit jen administrátor.';
  end if;
  if new.phone is distinct from old.phone then
    raise exception 'Telefon může měnit jen administrátor.';
  end if;

  return new;
end;
$$;
