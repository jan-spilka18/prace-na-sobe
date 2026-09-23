import { isoWeekday } from "@/lib/date";

/**
 * Výběr připomínek, které mají právě teď odejít.
 *
 * Cron neběží na vteřinu přesně a nemusí se spustit každou minutu, takže se
 * nehledá přesná shoda času, ale okno: „v posledních N minutách nastal čas
 * téhle připomínky". Bez okna by se při zpoždění o minutu připomínka toho
 * dne prostě neodeslala a nikdo by se to nedozvěděl.
 *
 * Připomínka se nikdy neposílá dopředu — okno sahá jen do minulosti.
 */
export type RemindableHabit = {
  id: string;
  title: string;
  weekdays: number[] | null;
  reminder_enabled: boolean;
  reminder_time: string | null;
  archived_at: string | null;
  /** Návyk už je na dnešek vyplněný — připomínat ho nemá smysl. */
  filled: boolean;
};

export function isDue(
  habit: RemindableHabit,
  date: string,
  nowMinutes: number,
  windowMinutes: number,
): boolean {
  if (!habit.reminder_enabled || !habit.reminder_time) return false;
  if (habit.filled) return false;
  if (habit.archived_at && habit.archived_at.slice(0, 10) <= date) return false;

  // Prázdný nebo chybějící rozvrh bereme jako každý den — stejně jako
  // scheduledOn(), aby se obě cesty chovaly shodně.
  const weekdays = habit.weekdays;
  if (Array.isArray(weekdays) && weekdays.length > 0) {
    if (!weekdays.includes(isoWeekday(date))) return false;
  }

  const due = parseMinutes(habit.reminder_time);
  if (due === null) return false;

  /*
    Okno se nesmí přetočit přes půlnoc. Připomínka na 23:50 by se jinak
    v 00:05 poslala znovu — už na další den, kde ji nikdo nečeká.
  */
  const start = Math.max(0, nowMinutes - windowMinutes);
  return due <= nowMinutes && due >= start;
}

export function dueReminders(
  habits: RemindableHabit[],
  date: string,
  nowMinutes: number,
  windowMinutes: number,
): RemindableHabit[] {
  return habits.filter((habit) => isDue(habit, date, nowMinutes, windowMinutes));
}

/** „07:30:00" i „07:30" na 450. Cokoli jiného na null. */
export function parseMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Text připomínky. Jedna věta, bez vykřičníku a bez vyčítání. */
export function reminderBody(habits: RemindableHabit[]): string {
  if (habits.length === 1) return habits[0].title;
  if (habits.length === 2) {
    return `${habits[0].title} a ${habits[1].title}`;
  }
  return `${habits[0].title} a další ${habits.length - 1}`;
}
