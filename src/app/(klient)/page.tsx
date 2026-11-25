import { APP_NAME } from "@/lib/config";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState } from "@/components/ui/List";
import { Button } from "@/components/ui/Button";
import { SettingsLink } from "@/components/SettingsLink";
import {
  activeProgram,
  allHabits,
  habitsForDay,
  programGrid,
  visionFor,
} from "@/lib/queries";
import {
  addDays,
  clampedProgramDay,
  daysBetween,
  describeDay,
  formatCzechDate,
  formatCzechDayMonth,
  formatCzechWeekday,
  todayISO,
} from "@/lib/date";
import { HabitRow } from "@/components/habits/HabitRow";
import { CelebrationProvider } from "@/components/habits/Celebration";
import { DayHero } from "@/components/habits/DayHero";
import { VisionQuote } from "@/components/VisionCard";
import { WeekStrip } from "@/components/habits/WeekStrip";
import { DayStateProvider } from "@/components/habits/DayState";
import { LastSessionFocus } from "@/components/session/LastSessionFocus";
import { runningStreak } from "@/lib/habits";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const profile = await requireProfile();
  const supabase = await createClient();
  const program = await activeProgram(supabase, profile.id);

  if (!program) {
    return (
      <Screen brand eyebrow="Vítej" title={APP_NAME} action={<SettingsLink />}>
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

  /*
    Nezávislé dotazy najednou, ne jeden po druhém. Dřív obrazovka čekala
    na každý zvlášť a jejich čas se sčítal; teď trvá jen tak dlouho jako
    ten nejpomalejší.
  */
  const [habits, days, vision, everyHabit, { data: lastSession }] =
    await Promise.all([
      habitsForDay(supabase, profile.id, date),
      programGrid(supabase, profile.id, program),
      visionFor(supabase, program.id),
      allHabits(supabase, profile.id),
      // Poslední publikované sezení (koncepty klient nevidí) — kvůli
      // fokusu a úkolům do příště.
      supabase
        .from("sessions")
        .select("id, content")
        .eq("client_id", profile.id)
        .order("session_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  // Rozlišuje „ještě si žádné nezadal" od „na dnešek žádný nepřipadá".
  const hasHabits = everyHabit.some((habit) => !habit.archived_at);
  const streak = runningStreak(days, date, addDays(date, -1));

  const dayNumber = clampedProgramDay(
    program.start_date,
    program.duration_days,
    date,
  );
  const notStarted = today < program.start_date;

  const daysBack = daysBetween(date, today);

  return (
    <Screen
      brand
      eyebrow={
        notStarted
          ? `Program začíná ${formatCzechDate(program.start_date)}`
          : // U starších dnů nese datum už sám nadpis, zbyde den v týdnu.
            daysBack > 2
            ? capitalize(formatCzechWeekday(date))
            : `${capitalize(formatCzechWeekday(date))} ${formatCzechDayMonth(date)}`
      }
      title={capitalize(describeDay(date, today))}
      action={<SettingsLink />}
    >
      {/*
        key podle data: při přepnutí na jiný den se stav postaví znovu.
        Bez něj by React u stejných návyků nechal staré komponenty a kolečka
        by ukazovala, co člověk odškrtal v předchozím dni.
      */}
      <DayStateProvider
        key={date}
        initial={Object.fromEntries(
          habits.map((habit) => [habit.id, habit.entry?.status ?? null]),
        )}
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <WeekStrip
              days={days}
              selected={date}
              today={today}
              hrefPrefix="/?den="
            />
            {daysBack > 0 && (
              <p className="pt-1 text-center text-[13px] font-medium text-ink-500">
                {daysBack === 1
                  ? "Doplňuješ včerejšek"
                  : `Doplňuješ ${daysBack} dní zpět`}
              </p>
            )}
          </div>

          {habits.length === 0 && !hasHabits ? (
            <EmptyState
              title="Ještě nemáš návyky"
              description="Zadej si tři, které chceš během výzvy dělat. Kdykoli je můžeš upravit."
              action={
                <Link href="/navyky">
                  <Button>Nastavit návyky</Button>
                </Link>
              }
            />
          ) : habits.length === 0 ? (
            // Návyky má, jen na tenhle den v týdnu žádný nepřipadá.
            <>
              <DayHero
                dayNumber={dayNumber}
                durationDays={program.duration_days}
                habits={[]}
                streak={streak}
                notStarted={notStarted}
              />
              <EmptyState
                title="Dneska máš volno"
                description="Na tenhle den sis žádný návyk nenaplánoval. Sérii ti to nezlomí."
              />
              {lastSession && (
                <LastSessionFocus
                  sessionId={lastSession.id}
                  content={lastSession.content ?? {}}
                />
              )}
              <VisionQuote body={vision} />
            </>
          ) : (
            <CelebrationProvider>
              <div className="space-y-5">
                <DayHero
                  dayNumber={dayNumber}
                  durationDays={program.duration_days}
                  habits={habits}
                  streak={streak}
                  notStarted={notStarted}
                />
                <section className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-3 px-1">
                    <h2 className="font-display text-[20px] font-bold tracking-tight text-ink">
                      Tvoje dnešní kroky
                    </h2>
                    <span className="shrink-0 text-[14px] text-ink-500">
                      {habits.length}{" "}
                      {habits.length === 1
                        ? "návyk"
                        : habits.length < 5
                          ? "návyky"
                          : "návyků"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {habits.map((habit) => (
                      <HabitRow key={habit.id} habit={habit} date={date} />
                    ))}
                  </div>

                  <p className="px-1 pt-0.5 text-[14px] text-ink-500">
                    Každý krok se počítá.
                  </p>
                </section>

                {/*
                  Fokus a vize jsou pod návyky schválně. Odškrtnutí je jediná
                  věc, kvůli které sem člověk denně chodí — nemá kvůli ní nic
                  přeskakovat.
                */}
                {lastSession && (
                  <LastSessionFocus
                    sessionId={lastSession.id}
                    content={lastSession.content ?? {}}
                  />
                )}
                <VisionQuote body={vision} />
              </div>
            </CelebrationProvider>
          )}
        </div>
      </DayStateProvider>
    </Screen>
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
