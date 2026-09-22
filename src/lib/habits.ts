import type {
  DayStatus,
  Habit,
  HabitEntry,
  HabitTarget,
  HabitType,
} from "@/lib/database.types";

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
 * Stav dne podle zadání:
 *   splněno   — všechny návyky splněny
 *   nesplněno — aspoň jeden odkliknutý jako nesplněný
 *   nevyplněno — u aspoň jednoho návyku chybí záznam
 *
 * Nevyplněno má přednost před nesplněno: když klient odklikl jeden návyk
 * jako nesplněný a další vůbec nevyplnil, den ještě není uzavřený.
 */
export function dayStatus(habits: HabitForDay[]): DayStatus {
  if (habits.length === 0) return "empty";

  if (habits.some((habit) => habit.entry === null)) return "empty";
  if (habits.some((habit) => habit.entry?.status === "missed")) return "incomplete";

  return "complete";
}

export const DAY_STATUS_LABELS: Record<DayStatus, string> = {
  complete: "Splněno",
  incomplete: "Nesplněno",
  empty: "Nevyplněno",
};

/** Návyk platil v daný den — po archivaci už se nenabízí k vyplnění. */
export function wasActiveOn(habit: Habit, onDate: string): boolean {
  if (!habit.archived_at) return true;
  return habit.archived_at.slice(0, 10) > onDate;
}
