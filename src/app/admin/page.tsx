import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ListGroup, ListRow } from "@/components/ui/List";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/SignOutButton";
import {
  addDays,
  daysBetween,
  formatCzechDayMonth,
  formatCzechWeekday,
  formatShortDate,
  todayISO,
} from "@/lib/date";
import {
  buildOverview,
  HISTORY_DAYS,
  yesterdayScore,
  type ClientRow,
} from "@/lib/adminOverview";
import { isRestDay, type DayOutcome } from "@/lib/summary";
import { upcomingBirthdays } from "@/lib/profile";
import { cookies } from "next/headers";
import { ThemePicker } from "@/components/ThemePicker";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { formatRating, summarizeFeedback } from "@/lib/feedbackOverview";

export const metadata = { title: "Klienti" };

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayISO();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  const { data: clients } = await supabase
    .from("profiles")
    // Hvězdička, ne výčet sloupců: narozeniny přibyly migrací 0007 a výčet
    // by před jejím spuštěním spadl na neexistujícím sloupci.
    .select("*")
    .eq("role", "client")
    .order("full_name");

  const ids = (clients ?? []).map((client) => client.id);

  /*
    Tři dotazy pro všechny klienty najednou, ne tři na každého. U deseti
    klientů je to rozdíl mezi třemi a třiceti cestami do databáze — a tahle
    obrazovka se otevírá jako první každé ráno.
  */
  const [{ data: programs }, { data: habits }, { data: entries }, { data: feedback }] =
    ids.length === 0
      ? [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]
      : await Promise.all([
          supabase
            .from("programs")
            .select("*")
            .eq("status", "active")
            .in("client_id", ids),
          supabase.from("habits").select("*").in("client_id", ids),
          supabase
            .from("habit_entries")
            .select("habit_id, client_id, entry_date, status")
            .in("client_id", ids)
            .gte("entry_date", addDays(today, -(HISTORY_DAYS - 1)))
            .lte("entry_date", today),
          // Hvězdička: hodnocení a téma přibyly migrací 0009.
          supabase.from("session_feedback").select("*"),
        ]);

  const birthdays = upcomingBirthdays(clients ?? [], today);
  const feedbackSummary = summarizeFeedback(feedback ?? [], today);

  const rows = buildOverview({
    clients: clients ?? [],
    programs: programs ?? [],
    habits: habits ?? [],
    entries: entries ?? [],
    today,
  });

  const score = yesterdayScore(rows);
  const yesterday = addDays(today, -1);

  // Posledních sedm uzavřených dní: kolik procent aktivních klientů splnilo
  // všechno. Dnešek se nepočítá — ráno by vždycky vypadal jako propad.
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 7);
    const counted = rows
      .map((row) => row.history.find((day) => day.date === date))
      .filter((day): day is DayOutcome => !!day && !isRestDay(day));
    const complete = counted.filter((day) => day.missed + day.empty === 0).length;
    return {
      date,
      percent: counted.length === 0 ? null : Math.round((complete / counted.length) * 100),
    };
  });

  const phoneById = new Map(
    (clients ?? []).map((client) => [client.id, client.phone ?? null]),
  );
  const nameById = new Map(rows.map((row) => [row.clientId, row.name]));
  const needYou = rows.filter((row) => row.patterns.length > 0);

  const latestQuote = [...(feedback ?? [])]
    .filter((row) => (row.takeaway ?? "").trim() !== "")
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

  // Programy, které brzy končí — čas domluvit závěrečné sezení.
  const ending = rows
    .filter((row) => row.program && row.dayNumber && row.dayNumber > 0)
    .map((row) => ({
      name: row.name,
      left: daysBetween(
        today,
        addDays(row.program!.start_date, row.program!.duration_days - 1),
      ),
    }))
    .filter((item) => item.left >= 0 && item.left <= 10);

  const todayItems = [
    ...birthdays.map((birthday) => ({
      key: `b-${birthday.name}`,
      title: `${birthday.when === "dnes" ? "Dnes" : "Zítra"} má narozeniny ${birthday.name}`,
      hint: "Pošli mu přání",
    })),
    ...ending.map((item) => ({
      key: `e-${item.name}`,
      title:
        item.left === 0
          ? `${item.name} má dnes poslední den`
          : `${item.name} končí za ${item.left} ${item.left === 1 ? "den" : item.left < 5 ? "dny" : "dní"}`,
      hint: "Domluv si závěrečné sezení",
    })),
  ];

  return (
    <Screen
      eyebrow={`${formatCzechWeekday(today)} · ${formatCzechDayMonth(today)}`}
      title="Ranní přehled"
      action={<SignOutButton />}
    >
      <div className="space-y-5">
        {rows.length === 0 ? (
          <EmptyState
            title="Zatím žádní klienti"
            description="Založ prvního klienta a nastav mu začátek programu."
            action={
              <Link href="/admin/klienti/novy">
                <Button full={false}>Nový klient</Button>
              </Link>
            }
          />
        ) : (
          <>
            {/*
              Včerejšek nahoře. Dnešek je rozdělaný — v osm ráno ještě nikdo
              nic nemá, a kdyby tu svítila nula ze tří, vypadalo by to jako
              průšvih každé ráno.
            */}
            <section className="rounded-[24px] bg-night px-5 py-5 text-white">
              <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-sun">
                Včera · {formatCzechWeekday(yesterday)} {formatShortDate(yesterday)}
              </p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <p className="flex items-baseline gap-2 font-display">
                  <span className="text-[52px] font-extrabold leading-none tabular-nums">
                    {score.complete}
                  </span>
                  <span className="text-[16px] font-bold leading-tight text-white/70">
                    z {score.active}
                    <br />
                    splnilo všechno
                  </span>
                </p>
                <div className="flex items-end gap-1.5" aria-label="Posledních sedm dní">
                  {week.map((day, index) => (
                    <div key={day.date} className="flex flex-col items-center gap-1">
                      <div className="flex h-12 items-end">
                        <div
                          className={cn(
                            "w-3.5 rounded-[4px]",
                            index === week.length - 1 ? "bg-turquoise" : "bg-white/25",
                          )}
                          style={{ height: `${Math.max(4, ((day.percent ?? 0) / 100) * 48)}px` }}
                          title={day.percent === null ? "Volno" : `${day.percent} %`}
                        />
                      </div>
                      <span className="text-[9px] font-bold uppercase text-white/55">
                        {formatCzechWeekday(day.date).slice(0, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {needYou.length > 0 && (
              <section className="rounded-[24px] bg-sun-surface px-5 py-5">
                <h2 className="flex items-center gap-2 font-display text-[20px] font-extrabold tracking-tight text-ink">
                  Potřebují tě
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-badge px-1.5 text-[13px] text-white">
                    {needYou.length}
                  </span>
                </h2>
                <ul className="mt-3 space-y-3">
                  {needYou.map((row) => {
                    const phone = phoneById.get(row.clientId);
                    return (
                      <li key={row.clientId} className="rounded-[18px] bg-surface p-3.5">
                        <Link
                          href={`/admin/klienti/${row.clientId}`}
                          className="flex items-start gap-3"
                        >
                          <Avatar name={row.name} alert={false} />
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-ink">{row.name}</span>
                            {row.patterns.map((pattern, index) => (
                              <span
                                key={index}
                                className="mt-0.5 block text-[14px] leading-snug text-ink-600"
                              >
                                {withoutName(pattern.text, row.name)}
                              </span>
                            ))}
                          </span>
                        </Link>
                        {phone && (
                          <div className="mt-3 flex gap-2">
                            <a
                              href={`tel:${phone.replace(/\s+/g, "")}`}
                              className="flex-1 rounded-full bg-night py-2.5 text-center text-[14px] font-extrabold text-white"
                            >
                              Zavolat
                            </a>
                            <a
                              href={`sms:${phone.replace(/\s+/g, "")}`}
                              className="flex-1 rounded-full bg-canvas py-2.5 text-center text-[14px] font-extrabold text-ink"
                            >
                              Napsat
                            </a>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        <Link
          href="/admin/zpetna-vazba"
          className="block rounded-[24px] bg-turquoise px-5 py-5 text-on-sun transition-opacity active:opacity-85"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
              Zpětná vazba od kluků
            </span>
            {feedbackSummary.lastWeek > 0 && (
              <span className="shrink-0 whitespace-nowrap rounded-full bg-white/85 px-2.5 py-1 text-[12px] font-bold">
                {feedbackSummary.lastWeek} za týden
              </span>
            )}
          </span>
          {feedbackSummary.count === 0 ? (
            <span className="mt-2 block text-[16px] font-semibold">
              Zatím nikdo neodpověděl.
            </span>
          ) : (
            <>
              {feedbackSummary.average !== null && (
                <span className="mt-2 flex items-baseline gap-2 font-display">
                  <span className="text-[44px] font-extrabold leading-none tabular-nums">
                    {formatRating(feedbackSummary.average)}
                  </span>
                  <span className="text-[15px] font-bold opacity-75">/ 10 průměr</span>
                </span>
              )}
              {latestQuote && (
                <span className="mt-3 block rounded-[16px] bg-white/60 px-4 py-3">
                  <span className="line-clamp-3 block font-display text-[16px] font-bold leading-snug">
                    „{latestQuote.takeaway.trim()}“
                  </span>
                  <span className="mt-1.5 block text-[12px] font-bold opacity-70">
                    {nameById.get(latestQuote.client_id) ?? "Klient"} ·{" "}
                    {formatShortDate(latestQuote.created_at.slice(0, 10))}
                    {latestQuote.rating ? ` · ${latestQuote.rating}/10` : ""}
                  </span>
                </span>
              )}
            </>
          )}
          <span className="mt-3 inline-flex rounded-full bg-white/50 px-3 py-1.5 text-[13px] font-bold">
            Všechny odpovědi →
          </span>
        </Link>

        {todayItems.length > 0 && (
          <section className="space-y-3">
            <h2 className="px-1 font-display text-[22px] font-extrabold tracking-tight text-ink">
              Dnes
            </h2>
            <ul className="rounded-[24px] bg-surface px-5">
              {todayItems.map((item, index) => (
                <li
                  key={item.key}
                  className={cn("py-3.5", index > 0 && "border-t border-hairline")}
                >
                  <p className="text-[16px] font-bold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[14px] text-ink-500">{item.hint}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {rows.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
                Klienti
              </h2>
              <span className="text-[13px] font-semibold text-ink-500">
                {rows.length} aktivních
              </span>
            </div>
            <div className="rounded-[24px] bg-surface px-4">
              {rows.map((row, index) => (
                <ClientLine
                  key={row.clientId}
                  row={row}
                  today={today}
                  first={index === 0}
                />
              ))}
            </div>
            <Link
              href="/admin/klienti/novy"
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-night px-5 text-[16px] font-extrabold text-white transition-opacity active:opacity-80"
            >
              <span aria-hidden className="text-[20px] leading-none">+</span>
              Nový klient
            </Link>
          </section>
        )}

        <ThemePicker initial={theme} />

        <ListGroup title="Můj účet">
          <ListRow title="Změnit heslo" href="/zmena-hesla" />
          <ListRow
            title="Notifikace"
            subtitle="Vypnuté. Klíče a naplánované úlohy"
            href="/admin/notifikace"
          />
        </ListGroup>
      </div>
    </Screen>
  );
}

function ClientLine({
  row,
  today,
  first,
}: {
  row: ClientRow;
  today: string;
  first: boolean;
}) {
  // Posledních sedm uzavřených dní jako tečky: plná = všechno, světlá =
  // něco, šedá = nic. Volno tečku nemá, ať nevypadá jako výpadek.
  const last7 = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 7);
    return { date, day: row.history.find((day) => day.date === date) };
  });
  const counted = last7.filter(({ day }) => day && !isRestDay(day));
  const complete = counted.filter(
    ({ day }) => day && day.missed + day.empty === 0,
  ).length;
  const percent =
    counted.length === 0 ? null : Math.round((complete / counted.length) * 100);

  const subtitle = !row.program
    ? "Bez programu"
    : row.dayNumber === 0
      ? `Začíná ${formatShortDate(row.program.start_date)}`
      : `Den ${row.dayNumber} z ${row.program.duration_days}`;

  return (
    <Link
      href={`/admin/klienti/${row.clientId}`}
      className={cn(
        "flex items-center gap-3 py-3.5",
        !first && "border-t border-hairline",
      )}
    >
      <Avatar name={row.name} alert={row.patterns.length > 0} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{row.name}</span>
        <span className="mt-0.5 flex items-center gap-2">
          <span className="whitespace-nowrap text-[13px] text-ink-500">{subtitle}</span>
          {row.program && row.dayNumber !== 0 && (
            <span className="flex shrink-0 gap-[3px]" aria-hidden>
              {last7.map(({ date, day }) => (
                <span
                  key={date}
                  className={cn(
                    "h-2 w-2 rounded-full",
                    !day || isRestDay(day)
                      ? "bg-canvas"
                      : day.missed + day.empty === 0
                        ? "bg-turquoise"
                        : day.done > 0
                          ? "bg-turquoise-200"
                          : "bg-ink-300",
                  )}
                />
              ))}
            </span>
          )}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 font-display text-[16px] font-extrabold tabular-nums",
          percent === null
            ? "text-ink-400"
            : percent >= 80
              ? "text-turquoise-700"
              : "text-ink",
        )}
      >
        {percent === null ? "—" : `${percent} %`}
      </span>
    </Link>
  );
}

function Avatar({ name, alert }: { name: string; alert: boolean }) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="relative">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-turquoise-100 font-display text-[15px] font-extrabold text-turquoise-700">
        {initials}
      </div>
      {alert && (
        <span
          aria-label="Něco drhne"
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-badge ring-2 ring-surface"
        />
      )}
    </div>
  );
}

/** Vzorec začíná jménem klienta — pod jeho jménem by se opakovalo. */
function withoutName(text: string, name: string): string {
  if (!text.startsWith(name)) return text;
  const rest = text.slice(name.length).trim();
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
