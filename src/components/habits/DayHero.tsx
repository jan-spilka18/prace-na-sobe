import { cn } from "@/lib/cn";
import { dayStatus, type HabitForDay } from "@/lib/habits";

/**
 * Karta dne.
 *
 * Levá strana nese, kde v programu klient je. Pravá, jak na tom stojí dnes.
 * Dole úsečky — jedna za každý návyk, takže postup je vidět periferně,
 * bez čtení a bez počítání ze šířky jednoho proužku.
 */
export function DayHero({
  dayNumber,
  durationDays,
  habits,
  streak,
  notStarted = false,
}: {
  dayNumber: number;
  durationDays: number;
  habits: HabitForDay[];
  streak: number;
  notStarted?: boolean;
}) {
  const status = dayStatus(habits);
  const done = habits.filter((habit) => habit.entry?.status === "done").length;
  const complete = status === "complete" && habits.length > 0;

  return (
    <section
      className={cn(
        "rounded-sheet px-5 py-4 text-white",
        complete
          ? "bg-gradient-to-br from-turquoise to-turquoise-700"
          : "bg-gradient-to-br from-ink to-[#2c2c2e]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] text-white/55">
            {notStarted
              ? "Program ještě nezačal"
              : `Tvoje ${durationDays}denní výzva`}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 font-display">
            <span className="text-[17px] font-semibold text-white/70">Den</span>
            <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums">
              {dayNumber}
            </span>
            <span className="text-[15px] font-semibold text-white/55">
              z {durationDays}
            </span>
          </p>
        </div>

        {habits.length > 0 ? (
          <div className="shrink-0 pt-0.5 text-right">
            <p className="font-display text-[19px] font-bold tabular-nums">
              {done} ze {habits.length}
            </p>
            <p className="mt-0.5 text-[12px] leading-tight text-white/55">
              {habits.length === 1 ? "návyk splněn" : "návyky splněny"}
            </p>
          </div>
        ) : (
          <p className="shrink-0 pt-1 text-[15px] font-semibold text-white/70">
            Volno
          </p>
        )}
      </div>

      {habits.length > 0 && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <Segments habits={habits} onLight={complete} />
          {streak >= 2 && (
            <span className="shrink-0 text-[12px] font-semibold text-white/55">
              {streak} {streak < 5 ? "dny" : "dní"} v řadě
            </span>
          )}
        </div>
      )}
    </section>
  );
}

/** Úsečka za každý návyk. Zlomek vedle nese totéž pro čtečku. */
function Segments({
  habits,
  onLight,
}: {
  habits: HabitForDay[];
  onLight: boolean;
}) {
  return (
    <div aria-hidden className="flex min-w-0 flex-1 flex-wrap gap-1">
      {habits.map((habit) => (
        <span
          key={habit.id}
          className={cn(
            "h-1 w-6 rounded-full transition-colors duration-300",
            habit.entry?.status === "done"
              ? onLight
                ? "bg-white"
                : "bg-turquoise"
              : habit.entry?.status === "missed"
                ? "bg-white/25"
                : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}
