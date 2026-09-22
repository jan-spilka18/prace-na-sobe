import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card, EmptyState } from "@/components/ui/List";
import { DayGrid } from "@/components/DayGrid";
import { VisionCard } from "@/components/VisionCard";
import { activeProgram, programGrid, visionFor } from "@/lib/queries";
import { clampedProgramDay, todayISO } from "@/lib/date";

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

  const past = days.filter((day) => !day.isFuture);
  const complete = past.filter((day) => day.status === "complete").length;
  const rate = past.length === 0 ? 0 : Math.round((complete / past.length) * 100);

  return (
    <Screen title="Přehled" subtitle={program.title}>
      <div className="space-y-5">
        <VisionCard programId={program.id} body={vision} />

        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-turquoise text-white">
            <p className="text-[14px] opacity-90">Den</p>
            <p className="mt-1 text-[32px] font-bold leading-none tabular-nums">
              {dayNumber}
              <span className="ml-1 text-[17px] font-semibold opacity-80">
                z {program.duration_days}
              </span>
            </p>
          </Card>

          <Card>
            <p className="text-[14px] text-ink-600">Úspěšnost</p>
            <p className="mt-1 text-[32px] font-bold leading-none tabular-nums text-ink">
              {rate}
              <span className="ml-0.5 text-[17px] font-semibold text-ink-500">
                %
              </span>
            </p>
          </Card>
        </div>

        <DayGrid days={days} hrefFor={(date) => `/?den=${date}`} />
      </div>
    </Screen>
  );
}
