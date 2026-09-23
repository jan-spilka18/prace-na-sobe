import type {
  DayStatus,
  Habit,
  HabitEntry,
  HabitTarget,
  HabitType,
} from "@/lib/database.types";
import { isoWeekday } from "@/lib/date";

export type HabitForDay = Habit & {
  /** Cíl platný pro daný den. U typu ano/ne vždy null. */
  target: number | null;
  entry: HabitEntry | null;
};

export const HABIT_TYPE_LABELS: Record<HabitType, string> = {
  boolean: "Ano/ne",
  minutes: "Minuty",
  reps: "Opakování",
};

export const HABIT_TYPE_HINTS: Record<HabitType, string> = {
  boolean: "Prosté splnil / nesplnil.",
  minutes: "Zadáš cílový počet minut, třeba 20.",
  reps: "Zadáš cílový počet opakování, třeba 50.",
};

/**
 * Cíl platný pro daný den.
 *
 * `habit_targets` je časová řada, ne jedna hodnota — proto se bere poslední
 * záznam, který začal platit nejpozději v ten den. Díky tomu změna cíle
 * nesahá na minulost.
 */
export function targetFor(
  targets: HabitTarget[],
  habitId: string,
  onDate: string,
): number | null {
  let best: HabitTarget | null = null;

  for (const target of targets) {
    if (target.habit_id !== habitId) continue;
    if (target.effective_from > onDate) continue;
    if (!best || target.effective_from > best.effective_from) best = target;
  }

  return best?.target_value ?? null;
}

/** Popis cíle do denního přehledu: „20 min", „50×". */
export function formatTarget(type: HabitType, target: number | null): string | null {
  if (target === null) return null;
  if (type === "minutes") return `${target} min`;
  if (type === "reps") return `${target}×`;
  return null;
}

export function formatActual(type: HabitType, value: number | null): string | null {
  if (value === null) return null;
  if (type === "minutes") return `${value} min`;
  if (type === "reps") return `${value}×`;
  return null;
}

export function actualValueLabel(type: HabitType): string {
  return type === "minutes" ? "Kolik minut" : "Kolik opakování";
}

/**
 * Stav dne:
 *   volno      — na den nepřipadá žádný návyk
 *   splněno    — všechny naplánované návyky splněny
 *   nesplněno  — aspoň jeden odkliknutý jako nesplněný
 *   nevyplněno — u aspoň jednoho návyku chybí záznam
 *
 * Nevyplněno má přednost před nesplněno: když klient odklikl jeden návyk
 * jako nesplněný a další vůbec nevyplnil, den ještě není uzavřený.
 *
 * Na vstupu jsou jen návyky naplánované na ten den — filtruje je volající,
 * protože jedině on ví, o který den jde.
 */
export function dayStatus(habits: HabitForDay[]): DayStatus {
  if (habits.length === 0) return "rest";

  if (habits.some((habit) => habit.entry === null)) return "empty";
  if (habits.some((habit) => habit.entry?.status === "missed")) return "incomplete";

  return "complete";
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  complete: "Splněno",
  incomplete: "Nesplněno",
  empty: "Nevyplněno",
  rest: "Volno",
};

/**
 * Kolik dnů v řadě je splněných, počítáno zpětně od daného dne včetně.
 *
 * Nevyplněný ani nesplněný den sérii ukončí. Budoucí dny se neřeší —
 * série se počítá jen dozadu.
 */
export function streakEndingAt(
  days: Array<{ date: string; status: DayStatus }>,
  date: string,
): number {
  const index = days.findIndex((day) => day.date === date);
  if (index < 0) return 0;

  let streak = 0;
  for (let i = index; i >= 0; i--) {
    // Den volna sérii nepřeruší ani ji nenafoukne. Klient v něj nic neměl,
    // takže by bylo nespravedlivé počítat mu ho jako výpadek i jako výhru.
    if (days[i].status === "rest") continue;
    if (days[i].status !== "complete") break;
    streak++;
  }

  return streak;
}

/**
 * Série, která běží právě teď.
 *
 * Dokud dnešek není hotový, počítá se série ke včerejšku. Jinak by klient
 * po půlnoci viděl nulu, přestože má za sebou šest dní v řadě — což je
 * přesně ten okamžik, kdy potřebuje vidět, že se má na co navázat.
 */
export function runningStreak(
  days: Array<{ date: string; status: DayStatus }>,
  today: string,
  yesterday: string,
): number {
  const withToday = streakEndingAt(days, today);
  return withToday > 0 ? withToday : streakEndingAt(days, yesterday);
}

/** Návyk ještě nebyl archivovaný — po archivaci se nenabízí k vyplnění. */
export function wasActiveOn(habit: Habit, onDate: string): boolean {
  if (!habit.archived_at) return true;
  return habit.archived_at.slice(0, 10) > onDate;
}

/**
 * Návyk připadá na tenhle den v týdnu.
 *
 * Sloupec `weekdays` může chybět, když je databáze o krok pozadu za nasazeným
 * kódem — migrace se pouští ručně, takže mezi nasazením a spuštěním schématu
 * je okno, kdy tam ještě není. Návyk se v tu chvíli bere jako každodenní.
 * Pád celé aplikace kvůli chybějícímu sloupci je horší než na chvíli
 * ignorovaný rozvrh.
 */
export function scheduledOn(habit: Habit, onDate: string): boolean {
  if (!Array.isArray(habit.weekdays) || habit.weekdays.length === 0) return true;
  return habit.weekdays.includes(isoWeekday(onDate));
}

/** Návyk se v daný den skutečně vyplňuje: není archivovaný a připadá na něj. */
export function appliesOn(habit: Habit, onDate: string): boolean {
  return wasActiveOn(habit, onDate) && scheduledOn(habit, onDate);
}

export const WEEKDAY_SHORT = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export const EVERY_DAY = [1, 2, 3, 4, 5, 6, 7];
export const WORKDAYS = [1, 2, 3, 4, 5];

/** Popis rozvrhu do seznamu návyků: „Každý den", „Po–Pá", „Po, St, Pá". */
export function describeWeekdays(weekdays: number[]): string {
  if (!Array.isArray(weekdays) || weekdays.length === 0) return "Každý den";

  const sorted = [...weekdays].sort((a, b) => a - b);

  if (sorted.length === 7) return "Každý den";
  if (sameDays(sorted, WORKDAYS)) return "Po–Pá";
  if (sameDays(sorted, [6, 7])) return "Víkendy";

  return sorted.map((day) => WEEKDAY_SHORT[day - 1]).join(", ");
}

function sameDays(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}
