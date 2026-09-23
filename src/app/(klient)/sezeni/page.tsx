import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ListGroup, ListRow } from "@/components/ui/List";
import { feedbackFor, sessionsFor } from "@/lib/queries";
import { formatCzechDate } from "@/lib/date";
import { SESSION_KIND_LABELS, filledSections } from "@/lib/sessionTemplate";
import { plainText } from "@/lib/markdown";

export const metadata = { title: "Sezení" };

export default async function ClientSessionsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  // Politika v databázi pustí klientovi jen publikovaná sezení,
  // takže se tu nemusí filtrovat.
  const sessions = await sessionsFor(supabase, profile.id);
  const feedback = await feedbackFor(
    supabase,
    sessions.map((session) => session.id),
  );

  return (
    <Screen title="Sezení" subtitle="Zápisy z našich setkání">
      {sessions.length === 0 ? (
        <EmptyState
          title="Zatím tu nic není"
          description="Po každém sezení sem Honza přidá zápis. Objeví se tady, jakmile ho připraví."
        />
      ) : (
        <ListGroup>
          {sessions.map((session) => {
            const sections = filledSections(session.content ?? {});
            const preview = sections[0] ? plainText(sections[0].body) : "";

            return (
              <ListRow
                key={session.id}
                href={`/sezeni/${session.id}`}
                title={formatCzechDate(session.session_date)}
                subtitle={
                  <>
                    <span className="block">
                      {SESSION_KIND_LABELS[session.kind]}
                      {!feedback.has(session.id) && " · Čeká na tvoji zpětnou vazbu"}
                    </span>
                    {preview && (
                      <span className="mt-0.5 line-clamp-2 block text-ink-500">
                        {preview}
                      </span>
                    )}
                  </>
                }
              />
            );
          })}
        </ListGroup>
      )}
    </Screen>
  );
}
