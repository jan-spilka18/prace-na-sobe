import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { formatCzechDate } from "@/lib/date";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import { SessionEditor } from "./SessionEditor";

export default async function AdminSessionPage({
  params,
}: PageProps<"/admin/klienti/[id]/sezeni/[sessionId]">) {
  await requireAdmin();
  const { id, sessionId } = await params;

  const supabase = await createClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("client_id", id)
    .maybeSingle();

  if (!session) notFound();

  const { data: feedback } = await supabase
    .from("session_feedback")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  return (
    <Screen
      title={formatCzechDate(session.session_date)}
      subtitle={SESSION_KIND_LABELS[session.kind]}
      back={{ href: `/admin/klienti/${id}/sezeni`, label: "Sezení" }}
    >
      <SessionEditor
        session={session}
        feedback={feedback ?? null}
        clientId={id}
      />
    </Screen>
  );
}
