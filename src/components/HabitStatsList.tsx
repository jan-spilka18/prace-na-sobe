import { formatTotal, type HabitStat } from "@/lib/habitStats";

/**
 * Návyky jeden po druhém: jak jdou a kolik toho klient nasbíral.
 *
 * Proužek je vždycky tyrkysový, i u návyku, který drhne. Červená nebo černá
 * by z něj udělala známku ze školy — a cílem je vidět, kde to vázne,
 * ne se za to stydět.
 */
export function HabitStatsList({
  stats,
  title,
}: {
  stats: HabitStat[];
  title: string;
}) {
  if (stats.length === 0) return null;

  return (
    <section className="space-y-2.5">
      <h2 className="px-1 font-display text-[21px] font-bold tracking-tight text-ink">
        {title}
      </h2>

      <div className="space-y-2">
        {stats.map((stat) => (
          <article
            key={stat.habitId}
            className="rounded-group border border-hairline bg-surface px-4 py-3.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className={
                  stat.archived
                    ? "min-w-0 truncate text-[17px] font-semibold text-ink-500"
                    : "min-w-0 truncate text-[17px] font-semibold text-ink"
                }
              >
                {stat.title}
              </h3>

              <p className="shrink-0 font-display tabular-nums text-ink">
                {stat.rate === null ? (
                  <span className="text-[15px] text-ink-400">—</span>
                ) : (
                  <>
                    <span className="text-[22px] font-bold leading-none">
                      {stat.rate}
                    </span>
                    <span className="ml-0.5 text-[13px] font-semibold text-ink-500">
                      %
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="mt-1 flex items-baseline justify-between gap-3 text-[14px] text-ink-500">
              <span className="min-w-0 truncate">
                {stat.archived && "Ukončený · "}
                {formatTotal(stat.type, stat.total)}
              </span>
              <span className="shrink-0 tabular-nums">
                {stat.scheduled === 0
                  ? "hodnotí se od zítřka"
                  : `${stat.done} z ${stat.scheduled} dní`}
              </span>
            </div>

            <div
              className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-canvas"
              role="img"
              aria-label={
                stat.rate === null
                  ? "Zatím bez hodnocení"
                  : `Úspěšnost ${stat.rate} procent`
              }
            >
              <div
                className="h-full rounded-full bg-turquoise"
                style={{ width: `${stat.rate ?? 0}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
