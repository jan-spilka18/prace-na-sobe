import Link from "next/link";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { cn } from "@/lib/cn";
import { sessionHeading } from "@/lib/sessionTemplate";
import { formatRating, type FeedbackSummary } from "@/lib/feedbackOverview";
import type { SessionFeedback, SessionKind } from "@/lib/database.types";

type SessionInfo = {
  id: string;
  session_date: string;
  kind: SessionKind;
  client_id: string;
};

/** Vykreslení přehledu zpětné vazby. Data načítá page.tsx. */
export function FeedbackView({
  rows,
  total,
  sessionById,
  nameById,
  filterClients,
  clientFilter,
  summary,
}: {
  rows: SessionFeedback[];
  /** Všechny odpovědi bez filtru — rozhoduje o prázdné stránce. */
  total: number;
  sessionById: Map<string, SessionInfo>;
  nameById: Map<string, string>;
  filterClients: Array<{ id: string; name: string }>;
  clientFilter: string | null;
  summary: FeedbackSummary;
}) {
  return (
    <Screen
      title="Zpětná vazba"
      subtitle="Co klienti píšou po sezeních"
      back={{ href: "/admin", label: "Klienti" }}
    >
      <div className="space-y-5">
        {total === 0 ? (
          <EmptyState
            title="Zatím žádná zpětná vazba"
            description="Objeví se tady, jakmile klient pod zápisem ze sezení odpoví."
          />
        ) : (
          <>
            <section className="space-y-4 rounded-group bg-night p-5 text-white">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-white/60">
                    Průměrné hodnocení
                  </p>
                  <p className="mt-1.5 flex items-baseline gap-1.5 font-display">
                    <span className="text-[44px] font-extrabold leading-none tracking-tight">
                      {summary.average === null ? "–" : formatRating(summary.average)}
                    </span>
                    <span className="text-[17px] font-semibold text-white/60">/ 10</span>
                  </p>
                </div>
                <div className="text-right text-[14px] leading-snug text-white/75">
                  <p>
                    <span className="font-semibold text-white">{summary.count}</span>{" "}
                    {answers(summary.count)}
                  </p>
                  <p>{summary.lastWeek} za poslední týden</p>
                </div>
              </div>

              {summary.topTopics.length > 0 && (
                <div className="space-y-2 border-t border-white/12 pt-3.5">
                  <p className="text-[13px] font-semibold text-white/60">Nejvíc baví</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.topTopics.map((item) => (
                      <span
                        key={item.topic}
                        className="rounded-full bg-sun px-3 py-1 text-[13px] font-semibold text-on-sun"
                      >
                        {item.topic}
                        {item.count > 1 && ` · ${item.count}×`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {filterClients.length > 1 && (
              <nav
                aria-label="Klient"
                className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
              >
                <FilterChip href="/admin/zpetna-vazba" active={!clientFilter}>
                  Všichni
                </FilterChip>
                {filterClients.map((client) => (
                  <FilterChip
                    key={client.id}
                    href={`/admin/zpetna-vazba?klient=${client.id}`}
                    active={clientFilter === client.id}
                  >
                    {client.name}
                  </FilterChip>
                ))}
              </nav>
            )}

            <ul className="space-y-3">
              {rows.map((row) => {
                const session = sessionById.get(row.session_id);
                const when = session
                  ? sessionHeading(session.session_date, session.kind, 0)
                  : null;
                const details = [
                  row.favorite_topic ? `Nejvíc bavilo: ${row.favorite_topic}` : null,
                  row.feeling ? `Po sezení: ${row.feeling.toLowerCase()}` : null,
                ].filter(Boolean);

                return (
                  <li key={row.id} className="space-y-3 rounded-group bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[16px] font-semibold text-ink">
                          {nameById.get(row.client_id) ?? "Klient"}
                        </p>
                        {session && when && (
                          <Link
                            href={`/admin/klienti/${row.client_id}/sezeni/${session.id}`}
                            className="text-[14px] text-turquoise-700"
                          >
                            {when.title} · {when.subtitle}
                          </Link>
                        )}
                      </div>
                      {typeof row.rating === "number" && (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 font-display text-[15px] font-extrabold tabular-nums",
                            ratingTone(row.rating),
                          )}
                        >
                          {row.rating}/10
                        </span>
                      )}
                    </div>

                    {row.takeaway && (
                      <p className="whitespace-pre-line text-[16px] leading-relaxed text-ink">
                        „{row.takeaway}“
                      </p>
                    )}

                    {details.length > 0 && (
                      <p className="text-[14px] leading-snug text-ink-600">
                        {details.join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </Screen>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-[36px] shrink-0 items-center rounded-full px-3.5 text-[14px] font-semibold",
        active ? "bg-ink text-on-ink" : "bg-surface text-ink active:opacity-60",
      )}
    >
      {children}
    </Link>
  );
}

/** Barva podle hodnocení: tyrkysová dobré, žlutá střed, šedá slabé. */
function ratingTone(rating: number): string {
  if (rating >= 8) return "bg-turquoise-100 text-turquoise-700";
  if (rating >= 5) return "bg-sun-surface text-ink";
  return "bg-hairline text-ink";
}

function answers(count: number): string {
  if (count === 1) return "odpověď";
  if (count >= 2 && count <= 4) return "odpovědi";
  return "odpovědí";
}
