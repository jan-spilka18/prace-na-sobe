"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  SESSION_SECTIONS,
  TOPICS_KEY,
  sessionTopics,
} from "@/lib/sessionTemplate";
import type { SessionKind } from "@/lib/database.types";

export type SessionResult = { error?: string; sessionId?: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: SessionKind[] = ["coaching", "breathwork", "monthly_review", "pregame"];

/** Chyba, když kód běží dřív, než Honza v Supabase pustí novou migraci. */
function needsMigration(error: { code?: string; message: string }): boolean {
  return (
    ["PGRST204", "PGRST205", "42703", "42P01", "23514"].includes(error.code ?? "") ||
    /could not find the table|does not exist|violates check constraint/i.test(error.message)
  );
}

const MIGRATION_HINT =
  "Databáze čeká na aktualizaci: v Supabase spusť znovu schema.sql (SQL Editor → Run).";

/** Do obsahu pustí jen klíče ze šablony — nic jiného tam nemá co dělat. */
function cleanContent(content: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const section of SESSION_SECTIONS) {
    const body = (content[section.key] ?? "").trim();
    if (body !== "") cleaned[section.key] = body;
  }

  const topics = sessionTopics(content);
  if (topics.length > 0) cleaned[TOPICS_KEY] = topics.join("\n");

  return cleaned;
}

export async function createSession(input: {
  clientId: string;
  sessionDate: string;
  kind: SessionKind;
}): Promise<SessionResult> {
  await requireAdmin();

  if (!ISO_DATE.test(input.sessionDate)) return { error: "Vyber datum sezení." };
  if (!KINDS.includes(input.kind)) return { error: "Neznámý typ sezení." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      client_id: input.clientId,
      session_date: input.sessionDate,
      kind: input.kind,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Sezení se nepodařilo založit." };
  }

  revalidatePath("/", "layout");
  return { sessionId: data.id };
}

export async function updateSession(input: {
  sessionId: string;
  sessionDate: string;
  kind: SessionKind;
  content: Record<string, string>;
}): Promise<SessionResult> {
  await requireAdmin();

  if (!ISO_DATE.test(input.sessionDate)) return { error: "Datum nevypadá platně." };
  if (!KINDS.includes(input.kind)) return { error: "Neznámý typ sezení." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({
      session_date: input.sessionDate,
      kind: input.kind,
      content: cleanContent(input.content),
    })
    .eq("id", input.sessionId);

  if (error) return { error: needsMigration(error) ? MIGRATION_HINT : error.message };

  revalidatePath("/", "layout");
  return {};
}

/**
 * Poznámka pro Honzu k sezení — část zápisu „POZNÁMKA PRO HONZU
 * (neposílat)". Leží v tabulce, kterou klient nepřečte (migrace 0010),
 * nikdy v obsahu sezení.
 */
export async function saveCoachNote(input: {
  sessionId: string;
  note: string;
}): Promise<SessionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("session_coach_notes")
    .upsert(
      { session_id: input.sessionId, note: input.note.trim() },
      { onConflict: "session_id" },
    );

  if (error) return { error: needsMigration(error) ? MIGRATION_HINT : error.message };
  return {};
}

/**
 * Publikuje nebo vrací do konceptu.
 *
 * Klient vidí jen publikovaná sezení — hlídá to politika v databázi,
 * ne jen tahle funkce.
 */
export async function setSessionStatus(input: {
  sessionId: string;
  published: boolean;
}): Promise<SessionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: input.published ? "published" : "draft" })
    .eq("id", input.sessionId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export async function deleteSession(sessionId: string): Promise<SessionResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}

export type FeedbackResult = { error?: string; saved?: boolean };

/**
 * Zpětná vazba klienta po sezení: co si odnáší, hodnocení 1–10, téma,
 * které ho bavilo nejvíc, a jak se cítí. Nic z toho není povinné.
 */
export async function saveFeedback(input: {
  sessionId: string;
  feeling: string;
  takeaway: string;
  rating: number | null;
  favoriteTopic: string;
}): Promise<FeedbackResult> {
  await requireProfile();

  const rating =
    input.rating === null ? null : Math.round(Number(input.rating));
  if (rating !== null && !(rating >= 1 && rating <= 10)) {
    return { error: "Hodnocení musí být od 1 do 10." };
  }
  const favoriteTopic = input.favoriteTopic.trim().replace(/\s+/g, " ");
  if (favoriteTopic.length > 120) {
    return { error: "Téma je nějak dlouhé. Zkus ho zkrátit." };
  }

  const base = {
    session_id: input.sessionId,
    feeling: input.feeling.trim(),
    takeaway: input.takeaway.trim(),
  };

  const supabase = await createClient();
  let { error } = await supabase
    .from("session_feedback")
    .upsert(
      { ...base, rating, favorite_topic: favoriteTopic },
      { onConflict: "session_id" },
    );

  // Kód se nasadí dřív, než Honza v Supabase pustí migraci 0009. Do té doby
  // sloupce chybí — uloží se aspoň zbytek, ať klient o odpověď nepřijde.
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    ({ error } = await supabase
      .from("session_feedback")
      .upsert(base, { onConflict: "session_id" }));
  }

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
