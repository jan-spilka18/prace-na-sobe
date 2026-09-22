import { cn } from "@/lib/cn";
import { dayStatus, type HabitForDay } from "@/lib/habits";

/**
 * Karta dne. Záměrně těžší než všechno ostatní na obrazovce — je to
 * jediná věc, kterou má člověk vidět dřív, než začne číst.
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
        "overflow-hidden rounded-sheet text-white",
        // Přechod dává ploše hloubku, aby karta nevypadala jako výplň.
        complete
          ? "bg-gradient-to-br from-turquoise to-turquoise-700"
          : "bg-gradient-to-br from-ink to-[#2c2c2e]",
      )}
    >
      <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-5">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/60">
            {notStarted ? "Začínáš" : "Den"}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 font-display">
            <span className="text-[56px] font-bold leading-[0.85] tracking-tight tabular-nums">
              {dayNumber}
            </span>
            <span className="text-[19px] font-semibold text-white/70">
              z {durationDays}
            </span>
          </p>
        </div>

        {habits.length > 0 ? (
          <div className="pb-1 text-right">
            <p className="text-[28px] font-bold leading-none tabular-nums">
              {done}
              <span className="text-[17px] font-semibold text-white/60">
                /{habits.length}
              </span>
            </p>
            {/*
              Zlomek sám říká, jak den stojí. Stav dne pod ním by to jen
              zopakoval jinými slovy — „1/3 nevyplněno" se navíc čte divně.
            */}
            <p className="mt-1 text-[13px] text-white/70">
              {complete ? "hotovo" : "splněno"}
            </p>
          </div>
        ) : (
          <p className="pb-2 text-right text-[17px] font-semibold text-white/80">
            Volno
          </p>
        )}
      </div>

      <StreakStrip streak={streak} />
    </section>
  );
}

/**
 * Žlutý pruh se sérií. Je to jediné místo, kde se v aplikaci objeví
 * velká žlutá plocha — má nést radost, ne informaci navíc.
 */
function StreakStrip({ streak }: { streak: number }) {
  if (streak < 2) {
    return (
      <div className="border-t border-white/10 px-5 py-2.5">
        <p className="text-[13px] text-white/60">
          {streak === 1
            ? "První den série. Zítra na ni navážeš."
            : "Sérii nastartuješ prvním splněným dnem."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-sun px-5 py-2.5 text-ink">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-4 w-4 shrink-0"
        fill="currentColor"
      >
        <path d="M13.5 2c.3 3-1.2 4.5-2.7 6C9 9.7 7.5 11.3 7.5 14a4.5 4.5 0 009 0c0-1.4-.5-2.4-1.2-3.4.9.4 1.7 1 2.3 1.9A6.9 6.9 0 0119 16.3 7 7 0 015 16c0-3.5 2-5.4 3.8-7.2C10.6 7 12.2 5.4 13.5 2z" />
      </svg>
      <span className="text-[14px] font-semibold">
        {streak} {streak < 5 ? "dny" : "dní"} v řadě
      </span>
    </div>
  );
}
