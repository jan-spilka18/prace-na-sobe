import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { activeProgram, allHabits, habitTargets } from "@/lib/queries";
import { todayISO } from "@/lib/date";
import { HabitList } from "@/components/habits/HabitList";

export const metadata = { title: "Návyky" };

export default async function HabitsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const program = await activeProgram(supabase, profile.id);

  if (!program) {
    return (
      <Screen title="Návyky">
        <EmptyState
          title="Nemáš aktivní program"
          description="Návyky se zadávají k výzvě. Honza ti ji založí."
        />
      </Screen>
    );
  }

  const habits = await allHabits(supabase, profile.id);
  const targets = await habitTargets(
    supabase,
    habits.map((habit) => habit.id),
  );

  return (
    <Screen
      title="Návyky"
      subtitle="Co chceš dělat každý den. Kdykoli můžeš upravit."
    >
      <HabitList
        programId={program.id}
        habits={habits}
        targets={targets}
        today={todayISO()}
      />
    </Screen>
  );
}
