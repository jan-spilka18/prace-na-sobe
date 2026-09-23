import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { EmptyState, ListGroup, ListRow } from "@/components/ui/List";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/SignOutButton";
import { addDays, formatCzechDate, todayISO } from "@/lib/date";
import {
  allPatterns,
  buildOverview,
  HISTORY_DAYS,
  yesterdayScore,
  type ClientRow,
} from "@/lib/adminOverview";
import { describeOutcome, isRestDay } from "@/lib/summary";
import { cookies } from "next/headers";
import { ThemePicker } from "@/components/ThemePicker";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export const metadata = { title: "Klienti" };

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const today = todayISO();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "client")
    .order("full_name");

  const ids = (clients ?? []).map((client) => client.id);

  /*
    Tři dotazy pro všechny klienty najednou, ne tři na každého. U deseti
    klientů je to rozdíl mezi třemi a třiceti cestami do databáze — a tahle
    obrazovka se otevírá jako první každé ráno.
  */
  const [{ data: programs }, { data: habits }, { data: entries }] =
    ids.length === 0
      ? [{ data: [] }, { data: [] }, { data: [] }]
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
        ]);

  const rows = buildOverview({
    clients: clients ?? [],
    programs: programs ?? [],
    habits: habits ?? [],
    entries: entries ?? [],
    today,
  });

  const patterns = allPatterns(rows);
  const score = yesterdayScore(rows);
  const yesterday = addDays(today, -1);

  return (
    <Screen
      title="Klienti"
      subtitle={`${rows.length} aktivních`}
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
            <section className="rounded-group bg-night p-4 text-white">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55">
                Včera · {formatCzechDate(yesterday)}
              </p>
              <p className="mt-1.5 flex items-baseline gap-2 font-display">
                <span className="text-[31px] font-bold leading-none tabular-nums">
                  {score.complete}
                </span>
                <span className="text-[17px] font-semibold text-white/70">
                  z {score.active} splnilo všechno
                </span>
              </p>

              {patterns.length > 0 && (
                <ul className="mt-3.5 space-y-1.5 border-t border-white/12 pt-3">
                  {patterns.map((pattern, index) => (
                    <li key={index} className="flex gap-2 text-[14px]">
                      <span aria-hidden className="text-sun">
                        •
                      </span>
                      <span className="text-white/90">{pattern.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ListGroup title="Dnes">
              {rows.map((row) => (
                <ClientLine key={row.clientId} row={row} />
              ))}
            </ListGroup>

            <Link href="/admin/klienti/novy" className="block">
              <Button full>Nový klient</Button>
            </Link>
          </>
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

function ClientLine({ row }: { row: ClientRow }) {
  const todayLabel = !row.program
    ? "Bez programu"
    : row.dayNumber === 0
      ? `Začíná ${formatCzechDate(row.program.start_date)}`
      : isRestDay(row.today)
        ? "Volno"
        : describeOutcome(row.today);

  const complete =
    row.program !== null &&
    !isRestDay(row.today) &&
    row.today.done > 0 &&
    row.today.missed + row.today.empty === 0;

  return (
    <ListRow
      href={`/admin/klienti/${row.clientId}`}
      leading={<Avatar name={row.name} alert={row.patterns.length > 0} />}
      title={row.name}
      subtitle={
        row.program && row.dayNumber && row.dayNumber > 0
          ? `Den ${row.dayNumber} z ${row.program.duration_days}${
              row.streak >= 2 ? ` · ${row.streak} dní v řadě` : ""
            }`
          : undefined
      }
      trailing={
        <span
          className={
            complete
              ? "text-[15px] font-semibold text-turquoise-700"
              : "text-[15px] tabular-nums text-ink-500"
          }
        >
          {todayLabel}
        </span>
      }
    />
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
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-turquoise-100 text-[15px] font-semibold text-turquoise-700">
        {initials}
      </div>
      {alert && (
        <span
          aria-label="Něco drhne"
          className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-sun ring-2 ring-surface"
        />
      )}
    </div>
  );
}
