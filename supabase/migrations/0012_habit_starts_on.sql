/*
  # Návyk může začít až v průběhu výzvy

  Honza některým klientům přidává návyky třeba po dvou měsících. Bez data
  začátku se nový návyk počítal od prvního dne programu: všechny dny před
  jeho přidáním vypadaly jako nesplněné a úspěšnost spadla.

  starts_on = první den, kdy návyk platí. Prázdné = od začátku programu,
  takže stávající návyky se chovají přesně jako dřív.

  Opakované spuštění nic nerozbije.
*/

alter table public.habits
  add column if not exists starts_on date;
