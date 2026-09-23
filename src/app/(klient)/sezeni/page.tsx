import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { feedbackFor, sessionsFor } from "@/lib/queries";
import { formatCzechDate, formatCzechWeekday } from "@/lib/date";
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

  const waiting = sessions.filter((session) => !feedback.has(session.id)).length;

  return (
    <Screen
      title="Sezení"
      subtitle="Zápisy z našich setkání"
    >
      {sessions.length === 0 ? (
        <EmptyState
          title="Zatím tu nic není"
          description="Po každém sezení sem Honza přidá zápis. Objeví se tady, jakmile ho připraví."
        />
      ) : (
        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="font-display text-[21px] font-bold tracking-tight text-ink">
              {sessions.length === 1 ? "Jeden zápis" : "Naše zápisy"}
            </h2>
            {waiting > 0 && (
              <span className="shrink-0 text-[14px] text-ink-500">
                {waiting === 1
                  ? "1 čeká na vazbu"
                  : `${waiting} čekají na vazbu`}
              </span>
            )}
          </div>

          {/*
            Samostatné karty, ne slepený seznam. Sezení jsou od sebe týdny
            a každé je vlastní téma — vizuálně patří k sobě stejně volně
            jako návyky na denní obrazovce.
          */}
          <div className="space-y-2">
            {sessions.map((session) => {
              const sections = filledSections(session.content ?? {});
              const preview = sections[0] ? plainText(sections[0].body) : "";
              const needsFeedback = !feedback.has(session.id);

              return (
                <Link
                  key={session.id}
                  href={`/sezeni/${session.id}`}
                  className="flex items-start gap-3 rounded-group border border-hairline bg-surface py-3.5 pl-4 pr-2.5 transition-colors active:bg-canvas"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="truncate font-display text-[17px] font-bold text-ink">
                        {formatCzechDate(session.session_date)}
                      </h3>
                      {needsFeedback && (
                        <span className="shrink-0 rounded-full bg-sun-surface px-2 py-0.5 text-[11px] font-semibold text-ink">
                          Čeká na tebe
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-[14px] text-ink-500">
                      {SESSION_KIND_LABELS[session.kind]} ·{" "}
                      {formatCzechWeekday(session.session_date)}
                    </p>

                    {preview && (
                      <p className="mt-1.5 line-clamp-2 text-[15px] leading-snug text-ink-600">
                        {preview}
                      </p>
                    )}
                  </div>

                  <span
                    aria-hidden
                    className="flex h-7 w-7 shrink-0 items-center justify-center text-ink-400"
                  >
                    <svg
                      viewBox="0 0 8 14"
                      className="h-3.5 w-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 1l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </Screen>
  );
}
