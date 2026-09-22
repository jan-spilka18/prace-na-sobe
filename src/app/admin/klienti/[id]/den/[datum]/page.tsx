import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/List";
import { activeProgram, habitsForDay } from "@/lib/queries";
import {
  formatCzechDate,
  formatCzechWeekday,
  programDay,
  todayISO,
} from "@/lib/date";
import {
  DAY_STATUS_LABELS,
  dayStatus,
  formatActual,
  formatTarget,
  type HabitForDay,
} from "@/lib/habits";
import { cn } from "@/lib/cn";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminDayPage({
  params,
}: PageProps<"/admin/klienti/[id]/den/[datum]">) {
  await requireAdmin();
  const { id, datum } = await params;

  if (!ISO_DATE.test(datum)) notFound();

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const program = await activeProgram(supabase, id);
  const habits = await habitsForDay(supabase, id, datum);
  const status = dayStatus(habits);

  return (
    <Screen
      title={formatCzechDate(datum)}
      subtitle={
        program
          ? `${client.full_name || client.email} · den ${programDay(program.start_date, datum)} z ${program.duration_days} · ${formatCzechWeekday(datum)}`
          : `${client.full_name || client.email} · ${formatCzechWeekday(datum)}`
      }
      back={{ href: `/admin/klienti/${id}`, label: "Zpět" }}
    >
      <div className="space-y-4">
        <Card
          className={cn(
            status === "complete" && "bg-turquoise text-white",
            status === "incomplete" && "bg-ink text-white",
          )}
        >
          <p className="text-[17px] font-semibold">
            {DAY_STATUS_LABELS[status]}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[15px]",
              status === "empty" ? "text-ink-600" : "opacity-90",
            )}
          >
            {habits.filter((habit) => habit.entry?.status === "done").length} z{" "}
            {habits.length} splněno
          </p>
        </Card>

        {habits.length === 0 ? (
          <Card>
            <p className="text-[15px] text-ink-600">
              Klient v tenhle den neměl žádné návyky.
            </p>
          </Card>
        ) : (
          habits.map((habit) => <HabitDetail key={habit.id} habit={habit} />)
        )}
      </div>
    </Screen>
  );
}

function HabitDetail({ habit }: { habit: HabitForDay }) {
  const entry = habit.entry;
  // Cíl se bere ze zamrzlé hodnoty v záznamu — ta platila v ten den.
  // Dopočítaný cíl je jen náhrada pro dny, které klient nevyplnil.
  const target = formatTarget(habit.type, entry?.target_snapshot ?? habit.target);
  const actual = formatActual(habit.type, entry?.actual_value ?? null);

  return (
    <article className="rounded-group bg-surface p-4">
      <header className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-[17px] font-semibold text-ink">
          {habit.title}
        </h3>
        <StatusBadge status={entry?.status ?? null} />
      </header>

      <dl className="mt-3 space-y-1.5 text-[15px]">
        {target && (
          <Row label="Cíl" value={target} />
        )}
        {actual && (
          <Row label="Skutečnost" value={actual} highlight />
        )}
        {entry?.status === "done" && !actual && habit.type !== "boolean" && (
          <Row label="Skutečnost" value="nezadal/a" muted />
        )}
      </dl>

      {entry?.note && (
        <blockquote className="mt-3 rounded-card bg-canvas px-3 py-2 text-[15px] leading-relaxed text-ink">
          {entry.note}
        </blockquote>
      )}

      {entry?.backfilled && (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-sun px-2.5 py-1 text-[13px] font-medium text-sun-700">
          Doplněno zpětně {formatBackfill(entry.created_at)}
        </p>
      )}
    </article>
  );
}

function Row({
  label,
  value,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-600">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          highlight && "font-semibold text-ink",
          muted && "text-ink-500",
          !highlight && !muted && "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: "done" | "missed" | null }) {
  const label =
    status === "done" ? "Splněno" : status === "missed" ? "Nesplněno" : "Nevyplněno";

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold",
        status === "done" && "bg-turquoise-100 text-turquoise-700",
        status === "missed" && "bg-ink text-white",
        status === null && "bg-canvas text-ink-500",
      )}
    >
      {label}
    </span>
  );
}

function formatBackfill(createdAt: string): string {
  const date = createdAt.slice(0, 10);
  return date === todayISO() ? "dnes" : formatCzechDate(date);
}
