/*
  # „Co tě dnes bavilo nejvíc?" jako volný text

  Klient už nevybírá z nabídnutých témat, ale píše vlastními slovy.
  Původní limit 120 znaků byl na krátký název tématu, na pár vět nestačí.
  Omezení se přepíše na 1000 znaků — dost na odpověď, málo na román.

  Opakované spuštění nic nerozbije.
*/

alter table public.session_feedback
  drop constraint if exists session_feedback_topic_length;
alter table public.session_feedback
  add constraint session_feedback_topic_length
  check (char_length(favorite_topic) <= 1000);
