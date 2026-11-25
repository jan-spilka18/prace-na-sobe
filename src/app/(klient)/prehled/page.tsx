import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { DayGrid } from "@/components/DayGrid";
import { VisionCard } from "@/components/VisionCard";
import {
  activeProgram,
  habitStatsFor,
  programGrid,
  visionFor,
} from "@/lib/queries";
import { HabitStatsList } from "@/components/HabitStatsList";
import {
  addDays,
  clampedProgramDay,
  daysBetween,
  formatShortDate,
  todayISO,
} from "@/lib/date";
import { runningStreak, successRate } from "@/lib/habits";

export const metadata = { title: "Přehled" };

export default async function OverviewPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const program = await activeProgram(supabase, profile.id);

  if (!program) {
    return (
      <Screen eyebrow="Tvoje výzva" title="Přehled">
        <EmptyState
          title="Nemáš aktivní program"
          description="Až ti Honza výzvu založí, uvidíš tady průběh."
        />
      </Screen>
    );
  }

  // Nezávislé dotazy najednou — čeká se jen na ten nejpomalejší.
  const [days, vision, stats] = await Promise.all([
    programGrid(supabase, profile.id, program),
    visionFor(supabase, program.id),
    habitStatsFor(supabase, profile.id, program),
  ]);
  const today = todayISO();
  const dayNumber = clampedProgramDay(
    program.start_date,
    program.duration_days,
    today,
  );

  const rate = successRate(days, today);
  const streak = runningStreak(days, today, addDays(today, -1));
  const lastDate = addDays(program.start_date, program.duration_days - 1);
  const notStarted = today < program.start_date;
  const remaining = Math.max(0, daysBetween(today, lastDate));
  const progress = notStarted
    ? 0
    : Math.min(100, Math.round((dayNumber / program.duration_days) * 100));

  return (
    <Screen eyebrow={`Tvoje ${program.duration_days}denní výzva`} title="Přehled">
      <div className="space-y-5">
        {/* Kde v programu je — jedna věta, jedno číslo, jeden proužek. */}
        <section className="rounded-[24px] bg-night px-5 py-5 text-white">
          <p className="text-[13px] font-bold text-sun">
            Průběh výzvy
          </p>
          <p className="mt-2 flex items-baseline gap-2 font-display">
            <span className="text-[17px] font-bold text-white/70">Den</span>
            <span className="text-[44px] font-black leading-none tracking-tight tabular-nums">
              {notStarted ? 0 : dayNumber}
            </span>
            <span className="text-[17px] font-bold text-white/70">
              z {program.duration_days}
            </span>
          </p>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
            role="img"
            aria-label={`Hotovo ${progress} procent výzvy`}
          >
            <div
              className="h-full rounded-full bg-turquoise"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2.5 flex justify-between gap-3 text-[13px] font-semibold text-white/65">
            <span>Start {formatShortDate(program.start_date)}</span>
            <span>
              {notStarted
                ? "Ještě nezačala"
                : remaining === 0
                  ? "Poslední den"
                  : `Ještě ${remaining} ${dayWord(remaining)}`}
            </span>
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Tile
            className="bg-turquoise-100 text-ink"
            value={String(streak)}
            label={`${dayWord(streak)} v řadě`}
          />
          <Tile
            className="bg-sun-surface text-ink"
            value={`${rate} %`}
            label="splněných dní"
          />
        </div>

        <DayGrid
          days={days}
          today={today}
          title="Celá výzva"
          range={`${formatShortDate(program.start_date)} – ${formatShortDate(lastDate)}`}
          hrefFor={(date) => `/?den=${date}`}
        />

        <HabitStatsList stats={stats} title="Tvoje návyky" />

        <VisionCard programId={program.id} body={vision} />
      </div>
    </Screen>
  );
}

function dayWord(count: number): string {
  if (count === 1) return "den";
  if (count >= 2 && count <= 4) return "dny";
  return "dní";
}

function Tile({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) {
  return (
    <div className={`rounded-[22px] px-4 py-4 ${className}`}>
      <p className="font-display text-[34px] font-extrabold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[13px] font-bold leading-snug opacity-75">
        {label}
      </p>
    </div>
  );
}
