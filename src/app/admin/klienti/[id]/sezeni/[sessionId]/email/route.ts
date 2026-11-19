import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { sessionEmail } from "@/lib/sessionEmail";

/**
 * Náhled e-mailu se zápisem — přesně to, co by odešlo klientovi.
 * Jen pro admina; ukazuje poslední uložený stav zápisu.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/admin/klienti/[id]/sezeni/[sessionId]/email">,
) {
  await requireAdmin();
  const { id, sessionId } = await params;
  const supabase = await createClient();

  const [{ data: session }, { data: all }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("client_id", id)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("id, status")
      .eq("client_id", id)
      .order("session_date", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (!session) return new Response("Zápis nenalezen.", { status: 404 });

  const order =
    (all ?? [])
      .filter((row) => row.status === "published" || row.id === session.id)
      .findIndex((row) => row.id === session.id) + 1;

  const email = sessionEmail({
    sessionId: session.id,
    date: session.session_date,
    kind: session.kind,
    order,
    content: session.content ?? {},
    appUrl: new URL(request.url).origin,
  });

  return new Response(email.html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
