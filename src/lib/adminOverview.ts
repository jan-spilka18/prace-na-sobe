import { addDays } from "@/lib/date";
import { appliesOn } from "@/lib/habits";
import {
  isRestDay,
  patternsFor,
  type DayOutcome,
  type Pattern,
} from "@/lib/summary";
import type { Habit, HabitEntry, Program } from "@/lib/database.types";

/*
  Ranní přehled v adminu.

  Dělá totéž, co dřív dělal e-mail: řekne, kdo včera splnil a u koho něco
  drhne. Rozdíl je, že se spočítá ve chvíli, kdy se Honza podívá — žádná
  naplánovaná úloha, žádný tarif navíc.
*/

/** Kolik dní zpět se hledají vzorce. Dva týdny stačí na „opakovaně". */
export const HISTORY_DAYS = 14;

export type ClientRow = {
  clientId: string;
  name: string;
  program: Program | null;
  dayNumber: number | null;
  today: DayOutcome;
  yesterday: DayOutcome;
  streak: number;
  patterns: Pattern[];
};

type Input = {
  clients: Array<{ id: string; full_name: string; email: string }>;
  programs: Program[];
  habits: Habit[];
  entries: Pick<HabitEntry, "habit_id" | "client_id" | "entry_date" | "status">[];
  today: string;
};

export function buildOverview({
  clients,
  programs,
  habits,
  entries,
  today,
}: Input): ClientRow[] {
  const yesterday = addDays(today, -1);
  const from = addDays(today, -(HISTORY_DAYS - 1));

  return clients.map((client) => {
    const name = client.full_name || client.email;
    const program = programs.find((p) => p.client_id === client.id) ?? null;

    const clientHabits = habits.filter((h) => h.client_id === client.id);
    const clientEntries = entries.filter((e) => e.client_id === client.id);

    const history: DayOutcome[] = [];

    if (program) {
      const lastDay = addDays(program.start_date, program.duration_days - 1);

      for (let date = from; date <= today; date = addDays(date, 1)) {
        // Dny mimo program se nepočítají — jinak by klient, který začíná
        // zítra, vypadal jako někdo, kdo dva týdny mlčí.
        if (date < program.start_date || date > lastDay) continue;
        history.push(outcomeFor(clientHabits, clientEntries, date));
      }
    }

    const empty = (date: string): DayOutcome => ({
      date,
      done: 0,
      missed: 0,
      empty: 0,
    });

    return {
      clientId: client.id,
      name,
      program,
      dayNumber: program ? dayNumberFor(program, today) : null,
      today: history.find((d) => d.date === today) ?? empty(today),
      yesterday: history.find((d) => d.date === yesterday) ?? empty(yesterday),
      // Dnešek se do série nepočítá: než ho klient stihne odškrtat, vypadal
      // by jako výpadek a série by přes den mizela a zase se objevovala.
      streak: streakUpTo(history, yesterday),
      patterns: patternsFor(
        client.id,
        name,
        history.filter((d) => d.date <= yesterday),
      ),
    };
  });
}

function outcomeFor(
  habits: Habit[],
  entries: Pick<HabitEntry, "habit_id" | "entry_date" | "status">[],
  date: string,
): DayOutcome {
  const outcome: DayOutcome = { date, done: 0, missed: 0, empty: 0 };

  for (const habit of habits) {
    if (!appliesOn(habit, date)) continue;

    const entry = entries.find(
      (row) => row.habit_id === habit.id && row.entry_date === date,
    );

    if (!entry) outcome.empty++;
    else if (entry.status === "done") outcome.done++;
    else outcome.missed++;
  }

  return outcome;
}

/** Splněné dny v řadě, počítáno zpět od daného data včetně. Volno nepřeruší. */
export function streakUpTo(history: DayOutcome[], date: string): number {
  const upTo = history.filter((day) => day.date <= date);
  let streak = 0;

  for (let i = upTo.length - 1; i >= 0; i--) {
    const day = upTo[i];
    if (isRestDay(day)) continue;
    if (day.missed > 0 || day.empty > 0) break;
    streak++;
  }

  return streak;
}

function dayNumberFor(program: Program, today: string): number | null {
  if (today < program.start_date) return 0;

  const [sy, sm, sd] = program.start_date.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const days =
    Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(sy, sm - 1, sd)) / 86_400_000) + 1;

  return Math.min(days, program.duration_days);
}

/** Klienti, u kterých něco drhne. Míří nahoru obrazovky. */
export function allPatterns(rows: ClientRow[]): Pattern[] {
  return rows.flatMap((row) => row.patterns);
}

/** Kolik klientů včera splnilo všechno, z těch, kteří vůbec něco měli. */
export function yesterdayScore(rows: ClientRow[]): {
  complete: number;
  active: number;
} {
  const active = rows.filter(
    (row) => row.program !== null && !isRestDay(row.yesterday),
  );

  return {
    complete: active.filter(
      (row) => row.yesterday.missed + row.yesterday.empty === 0,
    ).length,
    active: active.length,
  };
}
