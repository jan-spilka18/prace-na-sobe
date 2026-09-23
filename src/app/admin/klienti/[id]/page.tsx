import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card, ListGroup, ListRow } from "@/components/ui/List";
import { clampedProgramDay, formatCzechDate, todayISO } from "@/lib/date";
import { DayGrid } from "@/components/DayGrid";
import { VisionCard } from "@/components/VisionCard";
import {
  HABIT_TYPE_LABELS,
  describeWeekdays,
  formatTarget,
  targetFor,
} from "@/lib/habits";
import {
  activeProgram,
  allHabits,
  habitStatsFor,
  habitTargets,
  programGrid,
  sessionsFor,
  visionFor,
} from "@/lib/queries";
import { ProgramForm } from "./ProgramForm";
import { DangerZone } from "./DangerZone";
import { HabitStatsList } from "@/components/HabitStatsList";

export default async function ClientDetailPage({
  params,
}: PageProps<"/admin/klienti/[id]">) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  // Dvě vlny místo deseti dotazů za sebou: nejdřív co zná jen id klienta,
  // pak co potřebuje program nebo seznam návyků.
  const [{ data: client }, program, allClientHabits, sessions] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      activeProgram(supabase, id),
      allHabits(supabase, id),
      sessionsFor(supabase, id),
    ]);

  if (!client) notFound();

  const habits = allClientHabits.filter((habit) => !habit.archived_at);
  const [targets, days, stats, vision] = await Promise.all([
    habitTargets(
      supabase,
      habits.map((habit) => habit.id),
    ),
    program ? programGrid(supabase, id, program) : Promise.resolve([]),
    program ? habitStatsFor(supabase, id, program) : Promise.resolve([]),
    program ? visionFor(supabase, program.id) : Promise.resolve(""),
  ]);
  const sessionCount = sessions.length;

  const today = todayISO();
  const day = program
    ? clampedProgramDay(program.start_date, program.duration_days, today)
    : null;

  return (
    <Screen
      title={client.full_name || client.email}
      subtitle={client.email}
      back={{ href: "/admin", label: "Klienti" }}
    >
      <div className="space-y-6">
        {program && (
          <Card className="bg-turquoise text-white">
            <p className="text-[15px] opacity-90">
              {day === 0 ? "Program začíná" : "Den"}
            </p>
            {day === 0 ? (
              <p className="mt-1 text-[24px] font-bold leading-tight">
                {formatCzechDate(program.start_date)}
              </p>
            ) : (
              <p className="mt-1 text-[44px] font-bold leading-none tracking-tight">
                {day}
                <span className="ml-1 text-[22px] font-semibold opacity-80">
                  z {program.duration_days}
                </span>
              </p>
            )}
          </Card>
        )}

        <ListGroup title="Účet">
          <ListRow title="E-mail" trailing={client.email} />
          <ListRow
            title="Účet založen"
            trailing={formatCzechDate(client.created_at.slice(0, 10))}
          />
          <ListRow
            title="Návod na plochu"
            trailing={client.onboarded_at ? "Prošel" : "Zatím ne"}
          />
        </ListGroup>

        {program ? (
          <ProgramForm program={program} />
        ) : (
          <ListGroup
            title="Program"
            footer="Klient nemá aktivní program. Bez něj neuvidí výzvu."
          >
            <ListRow title="Bez programu" />
          </ListGroup>
        )}

        {program && <VisionCard programId={program.id} body={vision} />}

        <ListGroup
          title="Návyky"
          footer={
            habits.length === 0
              ? "Klient si návyky zadá sám, nebo mu je předvyplníš ty."
              : undefined
          }
        >
          {habits.map((habit) => (
            <ListRow
              key={habit.id}
              title={habit.title}
              subtitle={`${describeWeekdays(habit.weekdays)} · ${HABIT_TYPE_LABELS[habit.type]}`}
              trailing={formatTarget(
                habit.type,
                targetFor(targets, habit.id, today),
              )}
            />
          ))}
          <ListRow
            href={`/admin/klienti/${id}/navyky`}
            title={
              habits.length === 0 ? "Předvyplnit návyky" : "Upravit návyky"
            }
            className="text-turquoise-700"
          />
        </ListGroup>

        <ListGroup
          title="Sezení"
          footer={
            sessionCount === 0
              ? "Zápisy ze sezení. Klient uvidí jen ty publikované."
              : undefined
          }
        >
          <ListRow
            href={`/admin/klienti/${id}/sezeni`}
            title={sessionCount === 0 ? "Založit první sezení" : "Zápisy ze sezení"}
            trailing={sessionCount > 0 ? String(sessionCount) : undefined}
            className={sessionCount === 0 ? "text-turquoise-700" : undefined}
          />
          <ListRow
            href={`/admin/klienti/${id}/soukrome`}
            title="Soukromé"
            subtitle="Poznámky a odkazy, které klient nevidí"
          />
        </ListGroup>

        {program && days.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
              Průběh
            </h2>
            <DayGrid
              days={days}
              today={today}
              hrefFor={(date) => `/admin/klienti/${id}/den/${date}`}
            />
          </section>
        )}

        <HabitStatsList stats={stats} title="Jak mu jdou návyky" />

        <DangerZone
          clientId={client.id}
          clientName={client.full_name || client.email}
        />
      </div>
    </Screen>
  );
}
