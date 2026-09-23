/*
  # Profil klienta a úvodní průvodce

  ## Profil
  Telefon a narozeniny. Z narozenin jen den a měsíc, bez roku: k popřání
  rok není potřeba a údaj, který aplikace nepotřebuje, nemá ani držet.

  ## Úvodní průvodce
  Nový klient po prvním přihlášení projde představení aplikace a nastavení
  profilu, vize a návyků. Průvodce jde kdykoli přeskočit nebo zavřít.

  Stávající klienti ho vidět nemají — aplikaci už znají. Proto trik
  s výchozí hodnotou: sloupec vznikne s výchozí hodnotou false, takže ji
  dostanou všechny řádky, které už v tabulce jsou. Hned potom se výchozí
  hodnota přepne na true a tu dostane každý profil založený od té chvíle.

  Opakované spuštění nic nerozbije: sloupec už existuje, takže se nepřidá
  znovu, a přepnutí výchozí hodnoty na true stávající řádky nemění.

  onboarded_at (z první migrace) se vyplní, když klient průvodce dokončí
  nebo zavře.
*/

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists birth_day smallint;
alter table public.profiles add column if not exists birth_month smallint;

alter table public.profiles drop constraint if exists profiles_phone_length;
alter table public.profiles add constraint profiles_phone_length check (
  phone is null or char_length(phone) between 6 and 20
);

/*
  Den musí v daném měsíci existovat. 29. února je povolený: bez roku
  nejde poznat přestupný rok a ten, kdo se ten den narodil, existuje.

  „is not null" ve druhé větvi není navíc. Bez něj by den bez měsíce
  prošel: porovnání s NULL nevrátí nepravdu, ale NULL, a CHECK propustí
  všechno, co není výslovně nepravda.
*/
alter table public.profiles drop constraint if exists profiles_birthday_valid;
alter table public.profiles add constraint profiles_birthday_valid check (
  (birth_day is null and birth_month is null)
  or (
    birth_day is not null
    and birth_month is not null
    and birth_month between 1 and 12
    and birth_day between 1 and case
      when birth_month = 2 then 29
      when birth_month in (4, 6, 9, 11) then 30
      else 31
    end
  )
);

alter table public.profiles
  add column if not exists onboarding_pending boolean not null default false;
alter table public.profiles
  alter column onboarding_pending set default true;

comment on column public.profiles.onboarded_at is
  'Kdy klient dokončil nebo zavřel úvodního průvodce.';
