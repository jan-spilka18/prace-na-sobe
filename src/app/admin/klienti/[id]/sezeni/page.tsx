import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { feedbackFor, sessionsFor } from "@/lib/queries";
import { formatCzechWeekday, formatShortDate } from "@/lib/date";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import { plainText } from "@/lib/markdown";
import { cn } from "@/lib/cn";
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

  // Pořadí, jak ho vidí klient: počítají se jen zveřejněná sezení.
  const published = sessions.filter((session) => session.status === "published");
  const drafts = sessions.length - published.length;

  return (
    <Screen
      eyebrow={client.full_name || client.email}
      title="Sezení"
      back={{ href: `/admin/klienti/${id}`, label: "Klient" }}
    >
      <div className="space-y-5">
        <NewSessionForm clientId={id} />

        {sessions.length === 0 ? (
          <div className="rounded-[24px] bg-surface px-5 py-8 text-center">
            <p className="font-display text-[19px] font-extrabold tracking-tight text-ink">
              Zatím žádné sezení
            </p>
            <p className="mx-auto mt-1.5 max-w-xs text-[15px] leading-snug text-ink-600">
              Založ první a vlož k němu zápis. Klient uvidí jen to, co zveřejníš.
            </p>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
                {sessions.length === 1 ? "Jedno sezení" : "Všechna sezení"}
              </h2>
              {drafts > 0 && (
                <span className="text-[13px] font-semibold text-ink-500">
                  {drafts === 1
                    ? "1 koncept"
                    : drafts < 5
                      ? `${drafts} koncepty`
                      : `${drafts} konceptů`}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {sessions.map((session) => {
                const isPublished = session.status === "published";
                const row = feedback.get(session.id);
                const order = published.length - published.indexOf(session);
                const focus = plainText(session.content?.focus ?? "").trim();
                const empty = Object.values(session.content ?? {}).every(
                  (value) => (value ?? "").trim() === "",
                );

                return (
                  <Link
                    key={session.id}
                    href={`/admin/klienti/${id}/sezeni/${session.id}`}
                    className="block rounded-[24px] bg-surface p-4 transition-colors active:bg-canvas"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-[56px] w-[60px] shrink-0 flex-col items-center justify-center rounded-[16px] font-display leading-none",
                          isPublished
                            ? "bg-canvas text-ink"
                            : "bg-sun-surface text-ink",
                        )}
                      >
                        <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                          {formatCzechWeekday(session.session_date).slice(0, 2)}
                        </span>
                        <span className="mt-1 whitespace-nowrap text-[14px] font-extrabold tabular-nums">
                          {formatShortDate(session.session_date)}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[18px] font-extrabold tracking-tight text-ink">
                          {SESSION_KIND_LABELS[session.kind]}
                        </span>
                        <span className="block text-[13px] font-semibold text-ink-500">
                          {isPublished
                            ? `${order}. sezení`
                            : empty
                              ? "Zápis ještě není napsaný"
                              : "Klient ho zatím nevidí"}
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

                    {focus && (
                      <span className="mt-3 line-clamp-2 block text-[15px] leading-snug text-ink-600">
                        <span className="font-semibold text-ink">Fokus:</span> {focus}
                      </span>
                    )}

                    <span className="mt-3 flex flex-wrap gap-1.5">
                      <Chip tone={isPublished ? "turquoise" : "sun"}>
                        {isPublished ? "Zveřejněno" : "Koncept"}
                      </Chip>
                      {session.emailed_at && <Chip>E-mail odeslán</Chip>}
                      {isPublished &&
                        (row ? (
                          <Chip tone="turquoise">
                            {row.rating
                              ? `Zpětná vazba · ${row.rating}/10`
                              : "Zpětná vazba ✓"}
                          </Chip>
                        ) : (
                          <Chip>Bez zpětné vazby</Chip>
                        ))}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Screen>
  );
}

function Chip({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "plain" | "turquoise" | "sun";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[12px] font-bold",
        tone === "turquoise" && "bg-turquoise-100 text-turquoise-700",
        tone === "sun" && "bg-sun-surface text-ink",
        tone === "plain" && "bg-canvas text-ink-600",
      )}
    >
      {children}
    </span>
  );
}
