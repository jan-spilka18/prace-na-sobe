"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SESSION_SECTIONS } from "@/lib/sessionTemplate";
import type { SessionKind } from "@/lib/database.types";

export type SessionResult = { error?: string; sessionId?: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS: SessionKind[] = ["coaching", "breathwork"];

/** Do obsahu pustí jen klíče ze šablony — nic jiného tam nemá co dělat. */
function cleanContent(content: Record<string, string>): Record<string, string> {
  const cleaned: Record<string, string> = {};

  for (const section of SESSION_SECTIONS) {
    const body = (content[section.key] ?? "").trim();
    if (body !== "") cleaned[section.key] = body;
  }

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

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
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

/** Zpětná vazba klienta po sezení. Dvě pole, nic víc. */
export async function saveFeedback(input: {
  sessionId: string;
  feeling: string;
  takeaway: string;
}): Promise<FeedbackResult> {
  await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("session_feedback").upsert(
    {
      session_id: input.sessionId,
      feeling: input.feeling.trim(),
      takeaway: input.takeaway.trim(),
    },
    { onConflict: "session_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { saved: true };
}
