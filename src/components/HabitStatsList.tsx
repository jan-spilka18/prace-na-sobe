import { cn } from "@/lib/cn";
import { formatTotal, type HabitStat } from "@/lib/habitStats";

/**
 * Návyky jeden po druhém: jak jdou a kolik toho klient nasbíral.
 *
 * Návyk, který drhne (pod 70 %), dostane žlutou, ne červenou ani černou.
 * Ty by z něj udělaly známku ze školy — cílem je vidět, kde to vázne,
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
    <section className="space-y-3">
      <h2 className="px-1 font-display text-[20px] font-bold tracking-tight text-ink">
        {title}
      </h2>

      <div className="rounded-[24px] bg-surface px-5">
        {stats.map((stat, index) => {
          const struggling = stat.rate !== null && stat.rate < 70;
          return (
            <article
              key={stat.habitId}
              className={cn("py-4", index > 0 && "border-t border-hairline")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3
                  className={cn(
                    "min-w-0 truncate text-[17px] font-bold",
                    stat.archived ? "text-ink-500" : "text-ink",
                  )}
                >
                  {stat.title}
                </h3>

                <p
                  className={cn(
                    "shrink-0 font-display text-[20px] font-bold leading-none tabular-nums",
                    stat.rate === null
                      ? "text-ink-400"
                      : struggling
                        ? "text-sun-700"
                        : "text-turquoise-700",
                  )}
                >
                  {stat.rate === null ? "—" : `${stat.rate} %`}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold tabular-nums text-ink-600">
                  {stat.scheduled === 0
                    ? "hodnotí se od zítřka"
                    : `${stat.done} z ${stat.scheduled} dní`}
                </span>
                <span className="rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold text-ink-600">
                  {stat.archived && "Ukončený · "}
                  {formatTotal(stat.type, stat.total)}
                </span>
              </div>

              <div
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas"
                role="img"
                aria-label={
                  stat.rate === null
                    ? "Zatím bez hodnocení"
                    : `Úspěšnost ${stat.rate} procent`
                }
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    struggling ? "bg-sun-600" : "bg-turquoise",
                  )}
                  style={{ width: `${stat.rate ?? 0}%` }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
