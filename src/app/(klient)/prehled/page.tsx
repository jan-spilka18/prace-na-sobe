import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card, EmptyState } from "@/components/ui/List";
import { DayGrid } from "@/components/DayGrid";
import { VisionCard } from "@/components/VisionCard";
import { activeProgram, programGrid, visionFor } from "@/lib/queries";
import { clampedProgramDay, todayISO } from "@/lib/date";
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

  const days = await programGrid(supabase, profile.id, program);
  const vision = await visionFor(supabase, program.id);
  const today = todayISO();
  const dayNumber = clampedProgramDay(
    program.start_date,
    program.duration_days,
    today,
  );

  const rate = successRate(days);

  return (
    <Screen title="Přehled" subtitle={program.title}>
      <div className="space-y-5">
        <VisionCard programId={program.id} body={vision} />

        {/*
          Dvě čísla v jedné kartě, oddělená linkou. Dvě samostatné dlaždice
          vypadaly jako statistický panel — tohle se čte jako jedna věta.
        */}
        <Card className="flex items-stretch gap-4">
          <Stat label="Den">
            {dayNumber}
            <StatUnit>z {program.duration_days}</StatUnit>
          </Stat>

          <div aria-hidden className="w-px shrink-0 bg-hairline" />

          <Stat label="Úspěšnost">
            {rate}
            <StatUnit>%</StatUnit>
          </Stat>
        </Card>

        <DayGrid days={days} today={today} hrefFor={(date) => `/?den=${date}`} />
      </div>
    </Screen>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-500">
        {label}
      </p>
      <p className="mt-1.5 font-display text-[32px] font-bold leading-none tabular-nums text-ink">
        {children}
      </p>
    </div>
  );
}

function StatUnit({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1 text-[15px] font-semibold text-ink-500">
      {children}
    </span>
  );
}
