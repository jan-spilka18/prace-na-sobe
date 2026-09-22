import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { HabitList } from "@/components/habits/HabitList";
import { activeProgram, allHabits, habitTargets } from "@/lib/queries";
import { todayISO } from "@/lib/date";

export default async function AdminHabitsPage({
  params,
}: PageProps<"/admin/klienti/[id]/navyky">) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const program = await activeProgram(supabase, id);
  const back = { href: `/admin/klienti/${id}`, label: "Zpět" };

  if (!program) {
    return (
      <Screen title="Návyky" back={back}>
        <EmptyState
          title="Klient nemá aktivní program"
          description="Návyky patří k programu. Založ mu nejdřív program."
        />
      </Screen>
    );
  }

  const habits = await allHabits(supabase, id);
  const targets = await habitTargets(
    supabase,
    habits.map((habit) => habit.id),
  );

  return (
    <Screen
      title="Návyky"
      subtitle={`${client.full_name || client.email} · můžeš předvyplnit i upravit`}
      back={back}
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
