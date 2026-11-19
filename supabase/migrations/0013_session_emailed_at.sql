/*
  # Kdy odešel klientovi e-mail se zápisem

  Po zveřejnění zápisu může aplikace poslat klientovi e-mail se shrnutím.
  Tenhle čas hlídá, aby odešel jen jednou: když Honza zápis vrátí do
  konceptu kvůli překlepu a zveřejní znovu, druhý e-mail sám nepřijde.
  Poslat ho znovu jde ručně.

  Opakované spuštění nic nerozbije.
*/

alter table public.sessions
  add column if not exists emailed_at timestamptz;
