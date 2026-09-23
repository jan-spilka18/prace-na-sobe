import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { formatCzechDate } from "@/lib/date";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import { SessionEditor } from "./SessionEditor";
import { PrepEditor } from "./PrepEditor";

export default async function AdminSessionPage({
  params,
}: PageProps<"/admin/klienti/[id]/sezeni/[sessionId]">) {
  await requireAdmin();
  const { id, sessionId } = await params;

  const supabase = await createClient();

  const [{ data: session }, { data: prep }, { data: feedback }] =
    await Promise.all([
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
    ]);

  if (!session) notFound();

  return (
    <Screen
      title={formatCzechDate(session.session_date)}
      subtitle={SESSION_KIND_LABELS[session.kind]}
      back={{ href: `/admin/klienti/${id}/sezeni`, label: "Sezení" }}
    >
      <div className="space-y-5">
        {/* Nad zápisem schválně: připravuje se dřív, než se píše. */}
        <PrepEditor sessionId={sessionId} initial={prep?.content ?? ""} />

        <SessionEditor
          session={session}
          feedback={feedback ?? null}
          clientId={id}
        />
      </div>
    </Screen>
  );
}
