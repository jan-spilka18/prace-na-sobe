/*
  # Hodnocení sezení a téma, které klienta bavilo nejvíc

  Ke zpětné vazbě přibývají dvě rychlé odpovědi na klepnutí:

  - rating: jak klient hodnotí sezení na škále 1–10. Nepovinné — prázdné
    znamená „neodpověděl", ne nulu, proto null a ne výchozí hodnota.
  - favorite_topic: téma, které ho bavilo nejvíc. Buď jedno z témat, která
    Honza k sezení nabídl, nebo vlastní text z volby „Jiné". Ukládá se jako
    text, ne odkaz na téma: Honza může témata později přepsat a odpověď
    klienta se tím nesmí změnit.

  Opakované spuštění nic nerozbije: sloupce a omezení se přidávají jen
  tehdy, když ještě neexistují.
*/

alter table public.session_feedback
  add column if not exists rating smallint,
  add column if not exists favorite_topic text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'session_feedback_rating_range'
      and conrelid = 'public.session_feedback'::regclass
  ) then
    alter table public.session_feedback
      add constraint session_feedback_rating_range
      check (rating is null or rating between 1 and 10);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'session_feedback_topic_length'
      and conrelid = 'public.session_feedback'::regclass
  ) then
    alter table public.session_feedback
      add constraint session_feedback_topic_length
      check (char_length(favorite_topic) <= 120);
  end if;
end $$;
