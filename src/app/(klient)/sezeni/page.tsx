import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { feedbackFor, sessionsFor } from "@/lib/queries";
import { formatCzechWeekday, formatShortDate } from "@/lib/date";
import { SESSION_KIND_LABELS, filledSections } from "@/lib/sessionTemplate";
import { parseTasks, refineTasks } from "@/lib/sessionTasks";
import { plainText } from "@/lib/markdown";
import { cn } from "@/lib/cn";

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

  // Nejstarší sezení, které ještě čeká — na to vede velká karta nahoře.
  const waiting = sessions.filter((session) => !feedback.has(session.id));
  const oldestWaiting = waiting[waiting.length - 1];

  return (
    <Screen eyebrow="Zápisy z našich setkání" title="Sezení">
      {sessions.length === 0 ? (
        <EmptyState
          title="Zatím tu nic není"
          description="Po každém sezení sem Honza přidá zápis. Objeví se tady, jakmile ho připraví."
        />
      ) : (
        <div className="space-y-5">
          {oldestWaiting && (
            <Link
              href={`/sezeni/${oldestWaiting.id}#zpetna-vazba`}
              className="block rounded-[24px] bg-night px-5 py-5 text-white transition-opacity active:opacity-85"
            >
              <span className="flex items-center gap-2 text-[13px] font-bold text-sun">
                <span className="h-2 w-2 rounded-full bg-badge" aria-hidden />
                {waiting.length > 1
                  ? `Čekají na tebe ${waiting.length}`
                  : "Čeká na tebe"}
              </span>
              <span className="mt-2 block font-display text-[20px] font-bold leading-snug tracking-tight">
                Co sis odnesl ze sezení?
              </span>
              <span className="mt-1 block text-[14px] font-semibold text-white/65">
                {SESSION_KIND_LABELS[oldestWaiting.kind]} ·{" "}
                {formatCzechWeekday(oldestWaiting.session_date)}{" "}
                {formatShortDate(oldestWaiting.session_date)}
              </span>
              <span className="mt-4 inline-flex items-center rounded-full bg-sun px-4 py-2.5 text-[15px] font-extrabold text-on-sun">
                Napsat zpětnou vazbu →
              </span>
            </Link>
          )}

          <section className="space-y-3">
            <h2 className="px-1 font-display text-[20px] font-bold tracking-tight text-ink">
              {sessions.length === 1 ? "Jedno sezení" : "Všechna sezení"}
            </h2>

            <div className="space-y-3">
              {sessions.map((session, index) => {
                const content = refineTasks(session.content ?? {});
                const focus = plainText(content.focus ?? "").trim();
                const fallback = focus
                  ? ""
                  : plainText(filledSections(content)[0]?.body ?? "");
                const tasks = parseTasks(content.tasks ?? "").filter(
                  (task) => task.whoKind !== "coach",
                ).length;
                const row = feedback.get(session.id);
                const needsFeedback = !row;
                const number = sessions.length - index;

                return (
                  <Link
                    key={session.id}
                    href={`/sezeni/${session.id}`}
                    className="block rounded-[24px] bg-surface p-4 transition-colors active:bg-canvas"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-[56px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[16px] font-display leading-none",
                          needsFeedback
                            ? "bg-night text-white"
                            : "bg-canvas text-ink",
                        )}
                      >
                        <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-70">
                          {formatCzechWeekday(session.session_date).slice(0, 2)}
                        </span>
                        <span className="mt-1 whitespace-nowrap text-[14px] font-extrabold tabular-nums">
                          {formatShortDate(session.session_date)}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[17px] font-semibold tracking-tight text-ink">
                          {SESSION_KIND_LABELS[session.kind]}
                        </span>
                        <span className="block text-[13px] font-semibold text-ink-500">
                          {number}. sezení
                        </span>
                      </span>
                      <svg
                        viewBox="0 0 8 14"
                        aria-hidden
                        className="h-3.5 w-2 shrink-0 text-ink-400"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M1 1l6 6-6 6" />
                      </svg>
                    </div>

                    {focus ? (
                      <span className="mt-3 block rounded-[16px] bg-turquoise-100 px-3.5 py-3">
                        <span className="block text-[13px] font-bold text-turquoise-700">
                          Fokus do příštího sezení
                        </span>
                        <span className="mt-1 line-clamp-3 block text-[15px] font-semibold leading-snug text-ink">
                          {focus}
                        </span>
                      </span>
                    ) : (
                      fallback && (
                        <span className="mt-3 line-clamp-2 block text-[15px] leading-snug text-ink-600">
                          {fallback}
                        </span>
                      )
                    )}

                    <span className="mt-3 flex flex-wrap gap-1.5">
                      {tasks > 0 && (
                        <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold text-ink-600">
                          {tasks}{" "}
                          {tasks === 1 ? "úkol" : tasks < 5 ? "úkoly" : "úkolů"}
                        </span>
                      )}
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[12px] font-bold",
                          needsFeedback
                            ? "bg-night text-white"
                            : "bg-turquoise-100 text-turquoise-700",
                        )}
                      >
                        {needsFeedback
                          ? "Čeká na tvoji zpětnou vazbu"
                          : row.rating
                            ? `Zpětná vazba · ${row.rating}/10`
                            : "Zpětná vazba odeslaná"}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </Screen>
  );
}
