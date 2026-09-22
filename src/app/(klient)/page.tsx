import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card, EmptyState } from "@/components/ui/List";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/SignOutButton";
import { activeProgram, habitsForDay } from "@/lib/queries";
import {
  addDays,
  clampedProgramDay,
  daysBetween,
  describeDay,
  formatCzechDate,
  formatCzechWeekday,
  todayISO,
} from "@/lib/date";
import { HabitCard } from "@/components/habits/HabitCard";
import { CelebrationProvider } from "@/components/habits/Celebration";
import { DAY_STATUS_LABELS, dayStatus, type HabitForDay } from "@/lib/habits";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const program = await activeProgram(supabase, profile.id);

  if (!program) {
    return (
      <Screen title="Práce na sobě" action={<SignOutButton />}>
        <EmptyState
          title="Zatím tu nic není"
          description="Honza ti výzvu založí před začátkem programu. Až bude připravená, objeví se tady."
        />
      </Screen>
    );
  }

  const today = todayISO();
  const lastDate = addDays(program.start_date, program.duration_days - 1);

  const { den } = await searchParams;
  const requested = typeof den === "string" ? den : today;
  // Budoucnost ani dny mimo program nedávají smysl — vždycky spadneme
  // zpátky na nejbližší platný den.
  const date = clampToProgram(requested, program.start_date, lastDate, today);

  const habits = await habitsForDay(supabase, profile.id, date);
  const dayNumber = clampedProgramDay(
    program.start_date,
    program.duration_days,
    date,
  );
  const notStarted = today < program.start_date;

  const prev = date > program.start_date ? addDays(date, -1) : null;
  const next = date < today && date < lastDate ? addDays(date, 1) : null;
  const daysBack = daysBetween(date, today);

  return (
    <Screen
      title={capitalize(describeDay(date, today))}
      subtitle={
        notStarted
          ? `Program začíná ${formatCzechDate(program.start_date)}`
          : `Den ${dayNumber} z ${program.duration_days} · ${formatCzechWeekday(date)} ${formatCzechDate(date)}`
      }
      action={<SignOutButton />}
    >
      <div className="space-y-4">
        <nav className="flex items-center gap-2">
          <DayStep href={prev ? `/?den=${prev}` : null} direction="prev" />
          <span className="flex-1 text-center text-[14px] text-ink-500">
            {daysBack === 1 && "Doplňuješ včerejšek"}
            {daysBack > 1 && `Doplňuješ ${daysBack} dní zpět`}
          </span>
          <DayStep href={next ? `/?den=${next}` : null} direction="next" />
        </nav>

        {habits.length === 0 ? (
          <EmptyState
            title="Ještě nemáš návyky"
            description="Zadej si tři, které chceš během výzvy dělat každý den. Kdykoli je můžeš upravit."
            action={
              <Link href="/navyky">
                <Button>Nastavit návyky</Button>
              </Link>
            }
          />
        ) : (
          <CelebrationProvider>
            <div className="space-y-4">
              <DaySummary habits={habits} />
              {habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} date={date} />
              ))}
            </div>
          </CelebrationProvider>
        )}
      </div>
    </Screen>
  );
}

function DaySummary({ habits }: { habits: HabitForDay[] }) {
  const status = dayStatus(habits);
  const done = habits.filter((habit) => habit.entry?.status === "done").length;
  const complete = status === "complete";

  return (
    <Card className={complete ? "bg-turquoise text-white" : "bg-surface"}>
      <div className="flex items-baseline justify-between">
        <span className={cnText(complete, "text-[17px] font-semibold")}>
          {complete ? "Máš hotovo" : DAY_STATUS_LABELS[status]}
        </span>
        <span className={cnText(complete, "text-[15px]", true)}>
          {done} z {habits.length}
        </span>
      </div>
    </Card>
  );
}

function cnText(onColor: boolean, base: string, muted = false): string {
  if (onColor) return muted ? `${base} opacity-90` : base;
  return muted ? `${base} text-ink-600` : `${base} text-ink`;
}

function DayStep({
  href,
  direction,
}: {
  href: string | null;
  direction: "prev" | "next";
}) {
  const label = direction === "prev" ? "Předchozí den" : "Další den";
  const path = direction === "prev" ? "M15 4l-7 8 7 8" : "M9 4l7 8-7 8";

  const icon = (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );

  if (!href) {
    return (
      <span
        aria-hidden
        className="flex h-11 w-11 items-center justify-center rounded-card text-ink-400 opacity-30"
      >
        {icon}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-card bg-surface text-turquoise-700 active:bg-canvas"
    >
      {icon}
    </Link>
  );
}

function clampToProgram(
  requested: string,
  startDate: string,
  lastDate: string,
  today: string,
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requested)) return today;
  if (requested > today) return today;
  if (requested > lastDate) return lastDate;
  if (requested < startDate) return startDate;
  return requested;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
