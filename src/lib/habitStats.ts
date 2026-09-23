import { addDays } from "@/lib/date";
import { appliesOn } from "@/lib/habits";
import type { Habit, HabitEntry, HabitType, Program } from "@/lib/database.types";

/*
  Statistiky po jednotlivých návycích.

  Aplikace od klienta každý den sbírá minuty a opakování, ale nikde mu je
  nevracela — viděl je jen zpětně po jednom dni. Tohle je vrací: kolik toho
  za program nasbíral a který návyk mu jde a který drhne.
*/

export type HabitStat = {
  habitId: string;
  title: string;
  type: HabitType;
  archived: boolean;
  /** Uzavřené dny, na které návyk připadal. Dnešek mezi ně nepatří. */
  scheduled: number;
  done: number;
  /** null, dokud není co hodnotit — typicky první den programu. */
  rate: number | null;
  /**
   * Minuty nebo opakování dohromady. U ano/ne počet splněných dní.
   *
   * Na rozdíl od úspěšnosti se tu dnešek počítá: co klient dnes udělal,
   * udělal, i když den ještě neskončil.
   */
  total: number;
};

type EntryLike = Pick<
  HabitEntry,
  "habit_id" | "entry_date" | "status" | "actual_value" | "target_snapshot"
>;

export function habitStats(
  habits: Habit[],
  entries: EntryLike[],
  program: Pick<Program, "start_date" | "duration_days">,
  today: string,
): HabitStat[] {
  const lastDate = addDays(program.start_date, program.duration_days - 1);
  const lastClosed = minDate(addDays(today, -1), lastDate);
  const lastCounted = minDate(today, lastDate);

  const byHabit = new Map<string, Map<string, EntryLike>>();
  for (const entry of entries) {
    let forHabit = byHabit.get(entry.habit_id);
    if (!forHabit) {
      forHabit = new Map();
      byHabit.set(entry.habit_id, forHabit);
    }
    forHabit.set(entry.entry_date, entry);
  }

  const stats = habits.map((habit): HabitStat => {
    const forHabit = byHabit.get(habit.id) ?? new Map<string, EntryLike>();

    let scheduled = 0;
    let done = 0;

    for (
      let date = program.start_date;
      date <= lastClosed;
      date = addDays(date, 1)
    ) {
      if (!appliesOn(habit, date)) continue;
      scheduled++;
      if (forHabit.get(date)?.status === "done") done++;
    }

    let total = 0;
    for (const entry of forHabit.values()) {
      if (entry.status !== "done") continue;
      if (entry.entry_date < program.start_date) continue;
      if (entry.entry_date > lastCounted) continue;

      /*
        Splněno bez zapsané hodnoty znamená „dal jsem cíl". Počítá se tedy
        cíl platný ten den — ne nula, jinak by klient, který skutečnou
        hodnotu nevyplňuje, viděl celkem nulu minut po měsíci meditace.
      */
      total +=
        habit.type === "boolean"
          ? 1
          : (entry.actual_value ?? entry.target_snapshot ?? 0);
    }

    return {
      habitId: habit.id,
      title: habit.title,
      type: habit.type,
      archived: Boolean(habit.archived_at),
      scheduled,
      done,
      rate: scheduled === 0 ? null : Math.round((done / scheduled) * 100),
      total,
    };
  });

  return stats
    // Ukončený návyk bez jediného záznamu nemá co říct.
    .filter((stat) => !stat.archived || stat.scheduled > 0 || stat.total > 0)
    .sort((a, b) => Number(a.archived) - Number(b.archived));
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

const NUMBER = new Intl.NumberFormat("cs-CZ");

/** „Celkem 18 h 20 min", „Celkem 2 340 opakování", „Splněno 23×". */
export function formatTotal(type: HabitType, total: number): string {
  if (type === "boolean") return `Splněno ${NUMBER.format(total)}×`;
  if (type === "reps") return `Celkem ${NUMBER.format(total)} opakování`;

  const hours = Math.floor(total / 60);
  const minutes = Math.round(total % 60);
  if (hours === 0) return `Celkem ${minutes} min`;
  if (minutes === 0) return `Celkem ${NUMBER.format(hours)} h`;
  return `Celkem ${NUMBER.format(hours)} h ${minutes} min`;
}
