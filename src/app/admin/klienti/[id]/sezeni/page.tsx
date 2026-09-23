import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ListGroup, ListRow } from "@/components/ui/List";
import { feedbackFor, sessionsFor } from "@/lib/queries";
import { formatCzechDate } from "@/lib/date";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import { NewSessionForm } from "./NewSessionForm";

export default async function AdminSessionsPage({
  params,
}: PageProps<"/admin/klienti/[id]/sezeni">) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const sessions = await sessionsFor(supabase, id);
  const feedback = await feedbackFor(
    supabase,
    sessions.map((session) => session.id),
  );

  return (
    <Screen
      title="Sezení"
      subtitle={client.full_name || client.email}
      back={{ href: `/admin/klienti/${id}`, label: "Zpět" }}
    >
      <div className="space-y-5">
        <NewSessionForm clientId={id} />

        {sessions.length === 0 ? (
          <EmptyState
            title="Zatím žádné sezení"
            description="Založ první a připiš k němu zápis. Klient uvidí jen to, co publikuješ."
          />
        ) : (
          <ListGroup title={`${sessions.length} sezení`}>
            {sessions.map((session) => (
              <ListRow
                key={session.id}
                href={`/admin/klienti/${id}/sezeni/${session.id}`}
                title={formatCzechDate(session.session_date)}
                subtitle={
                  <>
                    {SESSION_KIND_LABELS[session.kind]}
                    {" · "}
                    {session.status === "published" ? "Publikováno" : "Koncept"}
                    {feedback.has(session.id) && " · Zpětná vazba"}
                  </>
                }
                leading={<StatusDot published={session.status === "published"} />}
              />
            ))}
          </ListGroup>
        )}

        <p className="px-4 text-[13px] leading-snug text-ink-500">
          Koncept klient nevidí — hlídá to databáze, ne jen tohle rozhraní.
        </p>

        <Link
          href={`/admin/klienti/${id}`}
          className="block px-4 text-[15px] text-turquoise-700"
        >
          Zpět na klienta
        </Link>
      </div>
    </Screen>
  );
}

function StatusDot({ published }: { published: boolean }) {
  return (
    <span
      aria-hidden
      className={
        published
          ? "block h-2.5 w-2.5 rounded-full bg-turquoise"
          : "block h-2.5 w-2.5 rounded-full border-2 border-ink-400"
      }
    />
  );
}
