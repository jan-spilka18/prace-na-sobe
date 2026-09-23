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
import { addDays, clampedProgramDay, formatShortDate, todayISO } from "@/lib/date";
import { successRate } from "@/lib/habits";

export const metadata = { title: "Přehled" };

export default async function OverviewPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const program = await activeProgram(supabase, profile.id);

  if (!program) {
    return (
      <Screen title="Přehled">
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
  const lastDate = addDays(program.start_date, program.duration_days - 1);

  return (
    <Screen title="Přehled" subtitle={program.title}>
      <div className="space-y-5">
        <VisionCard programId={program.id} body={vision} />

        {/*
          Čísla stojí přímo na pozadí, ne v kartě. Karta z nich dělala
          další objekt k přečtení; takhle se čtou jako nadpis k mřížce,
          která je pod nimi.
        */}
        <div className="flex items-stretch gap-5 px-1">
          <Stat value={dayNumber} unit={`z ${program.duration_days}`} label="den výzvy" />
          <div aria-hidden className="w-px shrink-0 bg-hairline" />
          <Stat value={rate} unit="%" label="splněných uzavřených dní" />
        </div>

        <DayGrid
          days={days}
          today={today}
          title={program.title}
          range={`${formatShortDate(program.start_date)} – ${formatShortDate(lastDate)}`}
          hrefFor={(date) => `/?den=${date}`}
        />

        <HabitStatsList stats={stats} title="Tvoje návyky" />
      </div>
    </Screen>
  );
}

function Stat({
  value,
  unit,
  label,
}: {
  value: number;
  unit: string;
  label: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-baseline gap-1 font-display">
        <span className="text-[38px] font-bold leading-none tracking-tight tabular-nums text-ink">
          {value}
        </span>
        <span className="text-[14px] font-semibold text-ink-500">{unit}</span>
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink-500">{label}</p>
    </div>
  );
}
