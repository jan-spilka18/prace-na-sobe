import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import Link from "next/link";
import {
  addDays,
  clampedProgramDay,
  formatCzechDate,
  formatShortDate,
  todayISO,
} from "@/lib/date";
import { runningStreak, successRate } from "@/lib/habits";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import { cn } from "@/lib/cn";
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
  feedbackFor,
  habitStatsFor,
  habitTargets,
  programGrid,
  sessionsFor,
  visionFor,
} from "@/lib/queries";
import { ProgramForm } from "./ProgramForm";
import { DangerZone } from "./DangerZone";
import { ResetOnboarding } from "./ResetOnboarding";
import { formatBirthday } from "@/lib/profile";
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
  const [targets, days, stats, vision, feedback] = await Promise.all([
    habitTargets(
      supabase,
      habits.map((habit) => habit.id),
    ),
    program ? programGrid(supabase, id, program) : Promise.resolve([]),
    program ? habitStatsFor(supabase, id, program) : Promise.resolve([]),
    program ? visionFor(supabase, program.id) : Promise.resolve(""),
    feedbackFor(
      supabase,
      sessions.map((session) => session.id),
    ),
  ]);
  const sessionCount = sessions.length;

  const today = todayISO();
  const day = program
    ? clampedProgramDay(program.start_date, program.duration_days, today)
    : null;
  const rate = successRate(days, today);
  const streak = runningStreak(days, today, addDays(today, -1));
  const progress =
    program && day ? Math.round((day / program.duration_days) * 100) : 0;
  const phone = client.phone?.replace(/\s+/g, "") ?? "";
  const name = client.full_name || client.email;
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  // Nejčerstvější slova klienta o sezení — co si opravdu odnesl.
  const latestFeedback = sessions
    .map((session) => ({ session, row: feedback.get(session.id) }))
    .find(({ row }) => row && row.takeaway.trim() !== "");

  return (
    <Screen
      eyebrow="Klient"
      title={name}
      back={{ href: "/admin", label: "Klienti" }}
    >
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-turquoise-100 font-display text-[19px] font-extrabold text-turquoise-700">
            {initials}
          </span>
          <div className="grid flex-1 grid-cols-3 gap-2">
            <ContactTile href={phone ? `tel:${phone}` : undefined} label="Zavolat" />
            <ContactTile href={phone ? `sms:${phone}` : undefined} label="Napsat" />
            <ContactTile href={`mailto:${client.email}`} label="E-mail" />
          </div>
        </div>

        {program && (
          <section className="rounded-[24px] bg-night px-5 py-5 text-white">
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-sun">
              {program.title || "Program"}
            </p>
            {day === 0 ? (
              <p className="mt-2 font-display text-[24px] font-extrabold leading-tight">
                Začíná {formatCzechDate(program.start_date)}
              </p>
            ) : (
              <>
                <p className="mt-2 flex items-baseline gap-2 font-display">
                  <span className="text-[17px] font-bold text-white/70">Den</span>
                  <span className="text-[48px] font-extrabold leading-none tabular-nums">
                    {day}
                  </span>
                  <span className="text-[17px] font-bold text-white/70">
                    z {program.duration_days}
                  </span>
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-turquoise"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-white/12 px-3 py-1 text-[13px] font-bold">
                    {rate} % splněných dní
                  </span>
                  {streak >= 2 && (
                    <span className="rounded-full bg-white/12 px-3 py-1 text-[13px] font-bold">
                      {streak} {streak < 5 ? "dny" : "dní"} v řadě
                    </span>
                  )}
                </p>
              </>
            )}
          </section>
        )}

        {program && days.length > 0 && (
          <DayGrid
            days={days}
            today={today}
            title="Průběh"
            hrefFor={(date) => `/admin/klienti/${id}/den/${date}`}
          />
        )}

        <HabitStatsList stats={stats} title="Jak mu jdou návyky" />

        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
              Sezení
            </h2>
            <Link
              href={`/admin/klienti/${id}/sezeni`}
              className="text-[15px] font-bold text-turquoise-700"
            >
              {sessionCount === 0 ? "Založit první" : `Všechna (${sessionCount})`}
            </Link>
          </div>

          {latestFeedback?.row && (
            <Link
              href={`/admin/zpetna-vazba?klient=${id}`}
              className="block rounded-[24px] bg-turquoise px-5 py-4 text-on-sun"
            >
              <span className="block text-[12px] font-bold uppercase tracking-[0.12em]">
                Naposledy si odnesl
              </span>
              <span className="mt-1.5 line-clamp-3 block font-display text-[17px] font-bold leading-snug">
                „{latestFeedback.row.takeaway.trim()}“
              </span>
              <span className="mt-1.5 block text-[12px] font-bold opacity-70">
                Sezení {formatShortDate(latestFeedback.session.session_date)}
                {latestFeedback.row.rating
                  ? ` · ${latestFeedback.row.rating}/10`
                  : ""}
              </span>
            </Link>
          )}

          {sessionCount > 0 && (
            <div className="rounded-[24px] bg-surface px-4">
              {sessions.slice(0, 3).map((session, index) => {
                const row = feedback.get(session.id);
                return (
                  <Link
                    key={session.id}
                    href={`/admin/klienti/${id}/sezeni/${session.id}`}
                    className={cn(
                      "flex items-center gap-3 py-3.5",
                      index > 0 && "border-t border-hairline",
                    )}
                  >
                    <span className="flex h-11 w-[58px] shrink-0 items-center justify-center whitespace-nowrap rounded-[14px] bg-canvas font-display text-[13px] font-extrabold tabular-nums text-ink">
                      {formatShortDate(session.session_date)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">
                        {SESSION_KIND_LABELS[session.kind]}
                      </span>
                      <span className="block text-[13px] text-ink-500">
                        {session.status === "published" ? "Publikované" : "Koncept"}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold",
                        row
                          ? "bg-turquoise-100 text-turquoise-700"
                          : "bg-canvas text-ink-500",
                      )}
                    >
                      {row
                        ? row.rating
                          ? `${row.rating}/10`
                          : "Vazba ✓"
                        : "Bez vazby"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <Link
          href={`/admin/klienti/${id}/soukrome`}
          className="block rounded-[24px] bg-night px-5 py-4 text-white"
        >
          <span className="block text-[12px] font-bold uppercase tracking-[0.12em] text-sun">
            Jen pro tebe
          </span>
          <span className="mt-1 block text-[15px] leading-snug text-white/85">
            Poznámky a odkazy, které klient nevidí →
          </span>
        </Link>

        <ListGroup title="Účet">
          <ListRow title="E-mail" trailing={client.email} />
          <ListRow
            title="Účet založen"
            trailing={formatCzechDate(client.created_at.slice(0, 10))}
          />
          <ListRow
            title="Telefon"
            trailing={
              client.phone ? (
                <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="text-turquoise-700">
                  {client.phone}
                </a>
              ) : (
                "Nevyplněno"
              )
            }
          />
          <ListRow
            title="Narozeniny"
            trailing={
              client.birth_day && client.birth_month
                ? formatBirthday(client.birth_day, client.birth_month)
                : "Nevyplněno"
            }
          />
          <ListRow
            title="Úvodní průvodce"
            trailing={
              client.onboarding_pending === true
                ? "Čeká na něj"
                : client.onboarded_at
                  ? `Prošel ${formatCzechDate(client.onboarded_at.slice(0, 10))}`
                  : "Neviděl"
            }
          />
          {client.onboarding_pending !== true && (
            <ResetOnboarding clientId={client.id} />
          )}
          <ListRow
            title="Změnit e-mail, telefon nebo heslo"
            href={`/admin/klienti/${client.id}/udaje`}
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

        <DangerZone
          clientId={client.id}
          clientName={client.full_name || client.email}
        />
      </div>
    </Screen>
  );
}

function ContactTile({ href, label }: { href?: string; label: string }) {
  const className =
    "flex h-11 items-center justify-center rounded-full text-[14px] font-extrabold";
  if (!href) {
    return (
      <span className={cn(className, "bg-surface text-ink-400")} title="Telefon není vyplněný">
        {label}
      </span>
    );
  }
  return (
    <a href={href} className={cn(className, "bg-surface text-ink")}>
      {label}
    </a>
  );
}
