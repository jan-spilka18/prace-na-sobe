import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { sessionHeading } from "@/lib/sessionTemplate";
import { SessionEditor } from "./SessionEditor";
import { PrepEditor } from "./PrepEditor";
import { emailConfigured } from "@/lib/email";

export default async function AdminSessionPage({
  params,
}: PageProps<"/admin/klienti/[id]/sezeni/[sessionId]">) {
  await requireAdmin();
  const { id, sessionId } = await params;

  const supabase = await createClient();

  const [
    { data: session },
    { data: prep },
    { data: feedback },
    { data: all },
    { data: coachNote },
    { data: client },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("client_id", id)
      .maybeSingle(),
    supabase
      .from("session_preps")
      .select("content")
      .eq("session_id", sessionId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("session_feedback")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, status")
      .eq("client_id", id)
      .order("session_date", { ascending: true })
      .order("created_at", { ascending: true }),
    // Před migrací 0010 tabulka chybí: dotaz vrátí chybu, data null
    // a poznámka je prázdná. Uložení pak řekne, co spustit.
    supabase
      .from("session_coach_notes")
      .select("note")
      .eq("session_id", sessionId)
      .maybeSingle(),
    supabase.from("profiles").select("full_name, email").eq("id", id).maybeSingle(),
  ]);

  if (!session) notFound();

  // Pořadí, jak ho uvidí klient: počítají se jen publikovaná sezení
  // (koncepty klient nevidí) a k nim tohle, i když je zatím koncept.
  const order =
    (all ?? [])
      .filter((row) => row.status === "published" || row.id === session.id)
      .findIndex((row) => row.id === session.id) + 1;

  const heading = sessionHeading(session.session_date, session.kind, order);
  const hasContent = Object.values(session.content ?? {}).some(
    (value) => (value ?? "").trim() !== "",
  );

  return (
    <Screen
      eyebrow={client?.full_name || client?.email || "Klient"}
      title={heading.title}
      subtitle={heading.subtitle}
      back={{ href: `/admin/klienti/${id}/sezeni`, label: "Sezení" }}
    >
      <SessionEditor
        session={session}
        feedback={feedback ?? null}
        clientId={id}
        order={order}
        coachNote={coachNote?.note ?? ""}
        email={{
          ready: emailConfigured(),
          to: client?.email ?? "",
          name: client?.full_name || client?.email || "klient",
        }}
        prep={
          // Před sezením otevřená, po něm (když už je zápis) sbalená.
          <PrepEditor
            sessionId={sessionId}
            initial={prep?.content ?? ""}
            defaultOpen={!hasContent}
          />
        }
      />
    </Screen>
  );
}
