"use client";

import { cn } from "@/lib/cn";
import { dayStatus, type HabitForDay } from "@/lib/habits";
import { useDayState } from "./DayState";
import type { EntryStatus } from "@/lib/database.types";

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
  habits: serverHabits,
  streak,
  notStarted = false,
}: {
  dayNumber: number;
  durationDays: number;
  habits: HabitForDay[];
  streak: number;
  notStarted?: boolean;
}) {
  // Uvnitř DayStateProvider bere stav z toho, co je právě odškrtnuté,
  // takže se „1 ze 3" změní hned při klepnutí, ne až po odpovědi serveru.
  const day = useDayState();
  const habits = day ? withLiveStatus(serverHabits, day.statuses) : serverHabits;

  const status = dayStatus(habits);
  const done = habits.filter((habit) => habit.entry?.status === "done").length;
  const complete = status === "complete" && habits.length > 0;

  const tone = complete ? "text-on-sun" : "text-white";
  const muted = complete ? "text-on-sun/70" : "text-white/70";

  return (
    <section
      className={cn(
        "space-y-3.5 rounded-[24px] px-5 py-5 transition-colors duration-300",
        complete ? "bg-turquoise" : "bg-night",
        tone,
      )}
    >
      <p
        className={cn(
          "text-[12px] font-bold uppercase tracking-[0.12em]",
          complete ? "text-on-sun/75" : "text-sun",
        )}
      >
        {notStarted
          ? "Program ještě nezačal"
          : `Tvoje výzva · den ${dayNumber} z ${durationDays}`}
      </p>

      <div className="flex items-end justify-between gap-3">
        {habits.length > 0 ? (
          <p className="flex items-baseline gap-2 font-display">
            <span className="text-[52px] font-extrabold leading-none tracking-tight tabular-nums">
              {done}
            </span>
            <span className={cn("text-[19px] font-bold", muted)}>
              {complete ? `ze ${habits.length} · hotovo` : `ze ${habits.length} hotové`}
            </span>
          </p>
        ) : (
          <p className="font-display text-[26px] font-extrabold leading-tight">Volno</p>
        )}

        {streak >= 2 && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold",
              complete ? "bg-surface/60" : "bg-white/10",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className={cn("h-[15px] w-[15px]", complete ? "text-on-sun" : "text-sun")}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z" />
            </svg>
            {streak} {streak < 5 ? "dny" : "dní"} v řadě
          </span>
        )}
      </div>

      {habits.length > 0 && <Segments habits={habits} onLight={complete} />}
    </section>
  );
}

/** Úsečka za každý návyk. Počet nad nimi nese totéž pro čtečku. */
function Segments({
  habits,
  onLight,
}: {
  habits: HabitForDay[];
  onLight: boolean;
}) {
  return (
    <div
      aria-hidden
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${habits.length}, minmax(0, 1fr))` }}
    >
      {habits.map((habit) => (
        <span
          key={habit.id}
          className={cn(
            "h-1.5 rounded-full transition-colors duration-300",
            habit.entry?.status === "done"
              ? onLight
                ? "bg-on-sun"
                : "bg-turquoise"
              : onLight
                ? "bg-on-sun/20"
                : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}

function withLiveStatus(
  habits: HabitForDay[],
  statuses: Record<string, EntryStatus | null>,
): HabitForDay[] {
  return habits.map((habit) => {
    if (!(habit.id in statuses)) return habit;
    const status = statuses[habit.id];
    return {
      ...habit,
      entry: status === null ? null : { ...habit.entry!, status },
    };
  });
}
