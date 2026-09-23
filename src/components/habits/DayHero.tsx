import { cn } from "@/lib/cn";
import { dayStatus, type HabitForDay } from "@/lib/habits";

/**
 * Karta dne. Záměrně těžší než všechno ostatní na obrazovce — je to
 * jediná věc, kterou má člověk vidět dřív, než začne číst.
 *
 * Drží se na dvou řádcích. Každý pixel, který si tahle karta vezme,
 * chybí dole návykům, a ty se mají vejít bez scrollování.
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
        "rounded-sheet px-4 py-3.5 text-white",
        // Přechod dává ploše hloubku, aby karta nevypadala jako výplň.
        complete
          ? "bg-gradient-to-br from-turquoise to-turquoise-700"
          : "bg-gradient-to-br from-ink to-[#2c2c2e]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-1.5 font-display">
          <span className="text-[15px] font-semibold text-white/60">
            {notStarted ? "Začínáš" : "Den"}
          </span>
          <span className="text-[31px] font-bold leading-none tracking-tight tabular-nums">
            {dayNumber}
          </span>
          <span className="text-[15px] font-semibold text-white/60">
            z {durationDays}
          </span>
        </p>

        <StreakChip streak={streak} onLight={complete} />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        {habits.length > 0 ? (
          <>
            <Dots habits={habits} onLight={complete} />
            <p className="shrink-0 text-[13px] tabular-nums text-white/70">
              {done} z {habits.length} splněno
            </p>
          </>
        ) : (
          <p className="text-[14px] text-white/70">Volno</p>
        )}
      </div>
    </section>
  );
}

/**
 * Postup jako tečky, ne proužek. Tři návyky = tři tečky, takže se dá
 * přečíst „kolik zbývá" jedním pohledem, bez počítání ze šířky.
 */
function Dots({
  habits,
  onLight,
}: {
  habits: HabitForDay[];
  onLight: boolean;
}) {
  return (
    // Číselný zlomek vedle nese totéž pro čtečku — tečky jsou jen obraz.
    <div aria-hidden className="flex min-w-0 flex-wrap items-center gap-1.5">
      {habits.map((habit) => (
        <span
          key={habit.id}
          className={cn(
            "h-2 w-2 rounded-full transition-colors duration-300",
            habit.entry?.status === "done"
              ? onLight
                ? "bg-white"
                : "bg-turquoise"
              : habit.entry?.status === "missed"
                ? "bg-white/25"
                : "ring-1 ring-inset ring-white/40",
          )}
        />
      ))}
    </div>
  );
}

/**
 * Série jako drobný štítek v rohu karty.
 *
 * Dřív to byl žlutý pruh přes celou šířku. Nesl ale míň informace než
 * cokoli kolem a bral nejvíc místa — série je odměna, ne hlavní údaj.
 */
function StreakChip({ streak, onLight }: { streak: number; onLight: boolean }) {
  if (streak < 1) return null;

  if (streak === 1) {
    return (
      <span className="shrink-0 rounded-full bg-white/12 px-2.5 py-1 text-[12px] font-semibold text-white/75">
        1. den série
      </span>
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
        onLight ? "bg-white text-turquoise-700" : "bg-sun text-ink",
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-3.5 w-3.5 shrink-0"
        fill="currentColor"
      >
        <path d="M13.5 2c.3 3-1.2 4.5-2.7 6C9 9.7 7.5 11.3 7.5 14a4.5 4.5 0 009 0c0-1.4-.5-2.4-1.2-3.4.9.4 1.7 1 2.3 1.9A6.9 6.9 0 0119 16.3 7 7 0 015 16c0-3.5 2-5.4 3.8-7.2C10.6 7 12.2 5.4 13.5 2z" />
      </svg>
      {streak} {streak < 5 ? "dny" : "dní"} v řadě
    </span>
  );
}
