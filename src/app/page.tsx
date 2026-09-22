import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card, EmptyState, ListGroup, ListRow } from "@/components/ui/List";
import { SignOutButton } from "@/components/SignOutButton";
import { clampedProgramDay, formatCzechDate, todayISO } from "@/lib/date";

export default async function HomePage() {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  const firstName = profile.full_name.split(" ")[0] || "vítej";

  if (!program) {
    return (
      <Screen title={`Ahoj, ${firstName}`} action={<SignOutButton />}>
        <EmptyState
          title="Zatím tu nic není"
          description="Honza ti výzvu založí před začátkem programu. Až bude připravená, objeví se tady."
        />
      </Screen>
    );
  }

  const today = todayISO();
  const day = clampedProgramDay(program.start_date, program.duration_days, today);
  const notStarted = day === 0;

  return (
    <Screen
      title={`Ahoj, ${firstName}`}
      subtitle={program.title}
      action={<SignOutButton />}
    >
      <div className="space-y-5">
        <Card className="bg-turquoise text-white">
          {notStarted ? (
            <>
              <p className="text-[15px] opacity-90">Program začíná</p>
              <p className="mt-1 text-[28px] font-bold leading-tight">
                {formatCzechDate(program.start_date)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] opacity-90">Den</p>
              <p className="mt-1 text-[44px] font-bold leading-none tracking-tight">
                {day}
                <span className="ml-1 text-[22px] font-semibold opacity-80">
                  z {program.duration_days}
                </span>
              </p>
            </>
          )}
        </Card>

        <ListGroup
          title="Program"
          footer="Denní odškrtávání návyků přibude v další etapě."
        >
          <ListRow title="Začátek" trailing={formatCzechDate(program.start_date)} />
          <ListRow title="Délka" trailing={`${program.duration_days} dní`} />
        </ListGroup>
      </div>
    </Screen>
  );
}
