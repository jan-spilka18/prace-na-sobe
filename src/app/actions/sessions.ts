"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SESSION_SECTIONS } from "@/lib/sessionTemplate";
import { refineTasks } from "@/lib/sessionTasks";
import type { SessionKind } from "@/lib/database.types";
import { appUrl } from "@/lib/appUrl";
import { emailConfigured, sendEmail } from "@/lib/email";
import { sessionEmail } from "@/lib/sessionEmail";

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

/**
 * Do obsahu pustí jen klíče ze šablony — nic jiného tam nemá co dělat.
 * Úkoly se přitom znovu vyhodnotí: otázka nebo tip, které Honza dopsal
 * do úkolů ručně, se uloží tam, kam patří.
 */
function cleanContent(content: Record<string, string>): Record<string, string> {
  const refined = refineTasks(content);
  const cleaned: Record<string, string> = {};

  for (const section of SESSION_SECTIONS) {
    const body = (refined[section.key] ?? "").trim();
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
export type PublishResult = SessionResult & {
  /** Komu odešel e-mail se zápisem. */
  emailedTo?: string;
  /** Zápis se zveřejnil, ale e-mail neodešel — proč. */
  emailError?: string;
};

export async function setSessionStatus(input: {
  sessionId: string;
  published: boolean;
  /** Po zveřejnění poslat klientovi e-mail se zápisem. */
  sendEmail?: boolean;
}): Promise<PublishResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ status: input.published ? "published" : "draft" })
    .eq("id", input.sessionId);

  if (error) return { error: error.message };

  let email: { emailedTo?: string; emailError?: string } = {};
  if (input.published && input.sendEmail) {
    const result = await deliverSessionEmail(supabase, input.sessionId);
    email = result.error ? { emailError: result.error } : { emailedTo: result.sentTo };
  }

  revalidatePath("/", "layout");
  return email;
}

/** Pošle e-mail se zápisem znovu — ručně, z editoru zápisu. */
export async function resendSessionEmail(sessionId: string): Promise<PublishResult> {
  await requireAdmin();
  const supabase = await createClient();
  const result = await deliverSessionEmail(supabase, sessionId);
  revalidatePath("/", "layout");
  return result.error ? { emailError: result.error } : { emailedTo: result.sentTo };
}

async function deliverSessionEmail(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
): Promise<{ error?: string; sentTo?: string }> {
  if (!emailConfigured()) {
    return { error: "E-maily zatím nejsou nastavené — chybí propojení s Gmailem ve Vercelu." };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: "Zápis nenalezen." };
  if (session.status !== "published") return { error: "Zápis ještě není zveřejněný." };

  const [{ data: client }, { data: published }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", session.client_id).single(),
    supabase
      .from("sessions")
      .select("id")
      .eq("client_id", session.client_id)
      .eq("status", "published")
      .order("session_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);
  if (!client?.email) return { error: "Klient nemá e-mail." };

  const order = (published ?? []).findIndex((row) => row.id === session.id) + 1;
  const email = sessionEmail({
    sessionId: session.id,
    date: session.session_date,
    kind: session.kind,
    order,
    content: session.content ?? {},
    appUrl: await appUrl(),
  });

  const sent = await sendEmail({ to: client.email, fromName: "Honza · Higher Self", ...email });
  if (!sent.ok) return { error: `E-mail neodešel: ${sent.error ?? "neznámá chyba"}` };

  // Bez migrace 0013 sloupec chybí — e-mail ale odešel, to je podstatné.
  await supabase
    .from("sessions")
    .update({ emailed_at: new Date().toISOString() })
    .eq("id", session.id);

  return { sentTo: client.email };
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
  const favoriteTopic = input.favoriteTopic.trim();
  if (favoriteTopic.length > 1000) {
    return { error: "Odpověď na to, co tě bavilo, je moc dlouhá. Zkus ji zkrátit." };
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

  // Před migrací 0011 pustí databáze u odpovědi jen 120 znaků. Klient
  // nemá vidět chybu kvůli tomu, že Honza ještě nespustil skript — uloží
  // se zkrácená odpověď, po migraci už celá.
  if (error?.code === "23514" && favoriteTopic.length > 120) {
    ({ error } = await supabase
      .from("session_feedback")
      .upsert(
        { ...base, rating, favorite_topic: `${favoriteTopic.slice(0, 119)}…` },
        { onConflict: "session_id" },
      ));
  }

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
