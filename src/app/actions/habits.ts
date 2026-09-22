"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { activeProgram, programGrid } from "@/lib/queries";
import { streakEndingAt } from "@/lib/habits";
import type { EntryStatus, HabitType } from "@/lib/database.types";

export type ActionResult = { error?: string };

export type SaveEntryResult = ActionResult & {
  /** Den je po tomhle uložení celý splněný. */
  dayComplete?: boolean;
  /** Kolik dnů v řadě je splněných, včetně tohoto. */
  streak?: number;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/", "layout");
}

/**
 * Uloží vyplnění návyku za jeden den.
 *
 * Posílá se celý stav řádku, ne jednotlivé změny — komponenta ho stejně drží
 * a jeden zápis je odolnější než tři, které se mohou poprat o pořadí.
 * `status: null` znamená, že klient klepnutí vzal zpět, a záznam se maže:
 * „nevyplněno" se v databázi modeluje chybějícím řádkem.
 */
export async function saveEntry(input: {
  habitId: string;
  date: string;
  status: EntryStatus | null;
  actualValue: number | null;
  note: string;
}): Promise<SaveEntryResult> {
  const profile = await requireProfile();

  if (!ISO_DATE.test(input.date)) return { error: "Neplatné datum." };

  const supabase = await createClient();

  if (input.status === null) {
    const { error } = await supabase
      .from("habit_entries")
      .delete()
      .eq("habit_id", input.habitId)
      .eq("entry_date", input.date);

    if (error) return { error: error.message };
    refresh();
    return {};
  }

  const note = input.note.trim();

  const { error } = await supabase.from("habit_entries").upsert(
    {
      habit_id: input.habitId,
      entry_date: input.date,
      status: input.status,
      actual_value: input.status === "done" ? input.actualValue : null,
      note: note === "" ? null : note,
    },
    { onConflict: "habit_id,entry_date" },
  );

  if (error) return { error: error.message };

  refresh();

  // Den může uzavřít jen splnění. Ostatní uložení (poznámka, hodnota)
  // stav dne nemění, takže není důvod kvůli nim sahat do databáze.
  if (input.status !== "done") return {};

  const program = await activeProgram(supabase, profile.id);
  if (!program) return {};

  const days = await programGrid(supabase, profile.id, program);
  const today = days.find((day) => day.date === input.date);

  return {
    dayComplete: today?.status === "complete",
    streak: streakEndingAt(days, input.date),
  };
}

export type HabitInput = {
  programId: string;
  title: string;
  type: HabitType;
  description: string;
  linkUrl: string;
  target: number | null;
};

export async function createHabit(input: HabitInput): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) return { error: "Návyk potřebuje název." };
  if (input.type !== "boolean" && (!input.target || input.target < 1)) {
    return { error: "Zadej cílovou hodnotu." };
  }

  const { data: last } = await supabase
    .from("habits")
    .select("position")
    .eq("program_id", input.programId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: habit, error } = await supabase
    .from("habits")
    .insert({
      program_id: input.programId,
      title,
      type: input.type,
      description: input.description.trim() || null,
      link_url: input.linkUrl.trim() || null,
      position: (last?.position ?? 0) + 1,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !habit) return { error: error?.message ?? "Nepodařilo se uložit." };

  if (input.type !== "boolean" && input.target) {
    // Začátek programu, ne dnešek — jinak by dny před založením návyku
    // zůstaly bez cíle.
    const { data: program } = await supabase
      .from("programs")
      .select("start_date")
      .eq("id", input.programId)
      .single();

    const { error: targetError } = await supabase.from("habit_targets").insert({
      habit_id: habit.id,
      target_value: input.target,
      effective_from: program?.start_date ?? new Date().toISOString().slice(0, 10),
    });

    if (targetError) return { error: targetError.message };
  }

  refresh();
  return {};
}

export async function updateHabit(input: {
  habitId: string;
  title: string;
  description: string;
  linkUrl: string;
}): Promise<ActionResult> {
  await requireProfile();

  const title = input.title.trim();
  if (!title) return { error: "Návyk potřebuje název." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({
      title,
      description: input.description.trim() || null,
      link_url: input.linkUrl.trim() || null,
    })
    .eq("id", input.habitId);

  if (error) return { error: error.message };

  refresh();
  return {};
}

/**
 * Změní cíl návyku od daného dne.
 *
 * Nepřepisuje existující řádek, ale přidává nový — v tom je celý smysl
 * `habit_targets`. Starší dny si tím drží původní cíl.
 */
export async function setHabitTarget(input: {
  habitId: string;
  target: number;
  effectiveFrom: string;
}): Promise<ActionResult> {
  await requireProfile();

  if (input.target < 1) return { error: "Cíl musí být kladné číslo." };
  if (!ISO_DATE.test(input.effectiveFrom)) return { error: "Neplatné datum." };

  const supabase = await createClient();
  const { error } = await supabase.from("habit_targets").upsert(
    {
      habit_id: input.habitId,
      target_value: input.target,
      effective_from: input.effectiveFrom,
    },
    { onConflict: "habit_id,effective_from" },
  );

  if (error) return { error: error.message };

  refresh();
  return {};
}

export async function archiveHabit(habitId: string): Promise<ActionResult> {
  await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", habitId);

  if (error) return { error: error.message };

  refresh();
  return {};
}

export async function restoreHabit(habitId: string): Promise<ActionResult> {
  await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("habits")
    .update({ archived_at: null })
    .eq("id", habitId);

  if (error) return { error: error.message };

  refresh();
  return {};
}

/** Smazat jde jen návyk bez historie — hlídá to i databáze. */
export async function deleteHabit(habitId: string): Promise<ActionResult> {
  await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("habits").delete().eq("id", habitId);

  if (error) {
    return {
      error: error.message.includes("vyplněné dny")
        ? "Návyk už má vyplněné dny. Můžeš ho archivovat."
        : error.message,
    };
  }

  refresh();
  return {};
}
