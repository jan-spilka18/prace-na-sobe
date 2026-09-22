import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Habit, HabitEntry, HabitTarget, Program } from "@/lib/database.types";
import { type HabitForDay, appliesOn, dayStatus, targetFor } from "@/lib/habits";
import { addDays, todayISO } from "@/lib/date";
import type { DayStatus } from "@/lib/database.types";

type Client = SupabaseClient<Database>;

export async function activeProgram(
  supabase: Client,
  clientId: string,
): Promise<Program | null> {
  const { data } = await supabase
    .from("programs")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .maybeSingle();

  return data ?? null;
}

/**
 * Návyky klienta i s cílem platným pro daný den a případným záznamem.
 *
 * Cíle se načtou všechny najednou a spárují v paměti. Volat kvůli každému
 * návyku funkci `habit_target_on` by znamenalo dotaz navíc za každý řádek,
 * a přitom jde o pár desítek záznamů.
 */
export async function habitsForDay(
  supabase: Client,
  clientId: string,
  date: string,
): Promise<HabitForDay[]> {
  const [{ data: habits }, { data: entries }] = await Promise.all([
    supabase
      .from("habits")
      .select("*")
      .eq("client_id", clientId)
      .order("position"),
    supabase
      .from("habit_entries")
      .select("*")
      .eq("client_id", clientId)
      .eq("entry_date", date),
  ]);

  const applicable = (habits ?? []).filter((habit) => appliesOn(habit, date));
  if (applicable.length === 0) return [];

  const { data: targets } = await supabase
    .from("habit_targets")
    .select("*")
    .in(
      "habit_id",
      applicable.map((habit) => habit.id),
    );

  const entryByHabit = new Map<string, HabitEntry>(
    (entries ?? []).map((entry) => [entry.habit_id, entry]),
  );

  return applicable.map((habit) => ({
    ...habit,
    target: targetFor(targets ?? [], habit.id, date),
    entry: entryByHabit.get(habit.id) ?? null,
  }));
}

export type GridDay = {
  date: string;
  dayNumber: number;
  status: DayStatus;
  isFuture: boolean;
};

/**
 * Stav každého dne programu pro mřížku průběhu.
 *
 * Načte se jeden balík záznamů za celý program a dny se dopočítají v paměti —
 * devadesát dotazů by bylo devadesátkrát pomalejší a výsledek stejný.
 */
export async function programGrid(
  supabase: Client,
  clientId: string,
  program: Program,
): Promise<GridDay[]> {
  const lastDate = addDays(program.start_date, program.duration_days - 1);

  const [{ data: habits }, { data: entries }] = await Promise.all([
    supabase.from("habits").select("*").eq("client_id", clientId),
    supabase
      .from("habit_entries")
      .select("*")
      .eq("client_id", clientId)
      .gte("entry_date", program.start_date)
      .lte("entry_date", lastDate),
  ]);

  const today = todayISO();
  const entriesByDate = new Map<string, Map<string, HabitEntry>>();

  for (const entry of entries ?? []) {
    let forDate = entriesByDate.get(entry.entry_date);
    if (!forDate) {
      forDate = new Map();
      entriesByDate.set(entry.entry_date, forDate);
    }
    forDate.set(entry.habit_id, entry);
  }

  const days: GridDay[] = [];

  for (let offset = 0; offset < program.duration_days; offset++) {
    const date = addDays(program.start_date, offset);
    const applicable = (habits ?? []).filter((habit) => appliesOn(habit, date));
    const forDate = entriesByDate.get(date);

    const withEntries: HabitForDay[] = applicable.map((habit) => ({
      ...habit,
      target: null,
      entry: forDate?.get(habit.id) ?? null,
    }));

    days.push({
      date,
      dayNumber: offset + 1,
      status: dayStatus(withEntries),
      isFuture: date > today,
    });
  }

  return days;
}

export async function visionFor(
  supabase: Client,
  programId: string,
): Promise<string> {
  const { data } = await supabase
    .from("visions")
    .select("body")
    .eq("program_id", programId)
    .maybeSingle();

  return data?.body ?? "";
}

export async function habitTargets(
  supabase: Client,
  habitIds: string[],
): Promise<HabitTarget[]> {
  if (habitIds.length === 0) return [];
  const { data } = await supabase
    .from("habit_targets")
    .select("*")
    .in("habit_id", habitIds)
    .order("effective_from", { ascending: false });

  return data ?? [];
}

export async function allHabits(
  supabase: Client,
  clientId: string,
): Promise<Habit[]> {
  const { data } = await supabase
    .from("habits")
    .select("*")
    .eq("client_id", clientId)
    .order("position");

  return data ?? [];
}
