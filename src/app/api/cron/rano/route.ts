import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/cron";
import { addDays, minutesSinceMidnight, todayISO } from "@/lib/date";
import { appliesOn } from "@/lib/habits";
import {
  patternsFor,
  summarySubject,
  type ClientSummary,
  type DayOutcome,
  type Pattern,
} from "@/lib/summary";
import { summaryHtml, summaryText } from "@/lib/summaryEmail";
import { emailConfigured, sendEmail } from "@/lib/email";
import { pushConfigured, sendPush } from "@/lib/push";
import { DAY_CUTOFF_HOUR } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Kolik dní zpět se hledají vzorce. Dva týdny stačí na „opakovaně". */
const HISTORY_DAYS = 14;

/**
 * Ranní vyhodnocení včerejška pro admina.
 *
 * Vercel spouští cron v UTC a Praha je podle ročního období o hodinu nebo
 * o dvě napřed, takže se úloha plánuje víckrát a sama si ohlídá, že je
 * opravdu ráno. Datum ve zdvojeném klíči zajistí, že i při dvou spuštěních
 * odejde zpráva jen jednou.
 */
export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = todayISO();
  const yesterday = addDays(today, -1);
  const hour = Math.floor(minutesSinceMidnight() / 60);

  // ?hned=1 obchází hodinu, aby se dal souhrn vyzkoušet kdykoli.
  const forced = request.nextUrl.searchParams.get("hned") === "1";
  if (!forced && hour !== DAY_CUTOFF_HOUR) {
    return NextResponse.json({ skipped: `Není ${DAY_CUTOFF_HOUR}:00 v Praze.`, hour });
  }

  /*
    Chyba dotazu se nesmí tvářit jako prázdný výsledek. Bez téhle kontroly
    by výpadek databáze skončil odpovědí „není komu poslat" se stavem 200 —
    souhrn by ráno nedorazil a nikde by po tom nezůstala stopa.
  */
  const { data: admins, error: adminsError } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "admin");

  if (adminsError) {
    return NextResponse.json(
      { error: `Adminy se nepodařilo načíst: ${adminsError.message}` },
      { status: 500 },
    );
  }

  if (!admins || admins.length === 0) {
    return NextResponse.json({ skipped: "Není komu poslat." });
  }

  const { data: clients, error: clientsError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "client")
    .order("full_name");

  if (clientsError) {
    return NextResponse.json(
      { error: `Klienty se nepodařilo načíst: ${clientsError.message}` },
      { status: 500 },
    );
  }

  const summaries: ClientSummary[] = [];
  const patterns: Pattern[] = [];
  const failures: string[] = [];
  const from = addDays(yesterday, -(HISTORY_DAYS - 1));

  for (const client of clients ?? []) {
    const name = client.full_name || client.email;

    const { data: program } = await supabase
      .from("programs")
      .select("*")
      .eq("client_id", client.id)
      .lte("start_date", yesterday)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Bez běžícího programu není co vyhodnocovat.
    if (!program) continue;
    if (addDays(program.start_date, program.duration_days - 1) < yesterday) continue;

    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("*")
      .eq("client_id", client.id);

    const { data: entries, error: entriesError } = await supabase
      .from("habit_entries")
      .select("habit_id, entry_date, status")
      .eq("client_id", client.id)
      .gte("entry_date", from)
      .lte("entry_date", yesterday);

    if (habitsError || entriesError) {
      /*
        Klient s nenačtenými záznamy by se v souhrnu objevil jako někdo,
        kdo celé dva týdny nic nevyplnil — tedy jako falešný poplach.
        Radši ho vynechat a selhání ohlásit.
      */
      failures.push(
        `${name}: ${(habitsError ?? entriesError)?.message ?? "neznámá chyba"}`,
      );
      continue;
    }

    const history: DayOutcome[] = [];

    for (let date = from; date <= yesterday; date = addDays(date, 1)) {
      if (date < program.start_date) continue;

      const scheduled = (habits ?? []).filter((habit) => appliesOn(habit, date));
      const outcome: DayOutcome = { date, done: 0, missed: 0, empty: 0 };

      for (const habit of scheduled) {
        const entry = (entries ?? []).find(
          (row) => row.habit_id === habit.id && row.entry_date === date,
        );
        if (!entry) outcome.empty++;
        else if (entry.status === "done") outcome.done++;
        else outcome.missed++;
      }

      history.push(outcome);
    }

    const yesterdayOutcome =
      history.find((day) => day.date === yesterday) ??
      ({ date: yesterday, done: 0, missed: 0, empty: 0 } as DayOutcome);

    // Série se počítá jen z vyhodnocovaného úseku — na souhrn to stačí
    // a ušetří to dotaz přes celý program.
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const day = history[i];
      const total = day.done + day.missed + day.empty;
      if (total === 0) continue; // volno sérii nepřeruší
      if (day.missed > 0 || day.empty > 0) break;
      streak++;
    }

    summaries.push({ clientId: client.id, name, outcome: yesterdayOutcome, streak });
    patterns.push(...patternsFor(client.id, name, history));
  }

  const subject = summarySubject(summaries, patterns);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("user_id, push_enabled, email_enabled");

  const results: Record<string, unknown>[] = [];

  for (const admin of admins) {
    const prefs = (settings ?? []).find((row) => row.user_id === admin.id);
    const wantsPush = prefs?.push_enabled ?? true;
    const wantsEmail = prefs?.email_enabled ?? true;

    /*
      Zámek proti dvojímu odeslání. Zapisuje se před odesláním: kdyby se
      logovalo až potom, dvě spuštění přes sebe pošlou souhrn dvakrát.
    */
    const { error: lockError } = await supabase.from("notification_log").insert({
      user_id: admin.id,
      kind: "daily_summary",
      channel: "email",
      dedupe_key: `summary:${admin.id}:${yesterday}`,
      payload: { clients: summaries.length, patterns: patterns.length },
    });

    if (lockError) {
      results.push({ admin: admin.email, skipped: "Už odesláno." });
      continue;
    }

    if (wantsEmail && emailConfigured()) {
      const sent = await sendEmail({
        to: admin.email,
        subject,
        text: summaryText(yesterday, summaries, patterns),
        html: summaryHtml(yesterday, summaries, patterns, appUrl),
      });
      results.push({ admin: admin.email, email: sent.ok, error: sent.error });
    }

    if (wantsPush && pushConfigured()) {
      const { data: devices } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", admin.id);

      for (const device of devices ?? []) {
        const push = await sendPush(device, {
          title: subject,
          body:
            patterns.length > 0
              ? patterns[0].text
              : "Podrobnosti máš v e-mailu.",
          url: "/admin",
          tag: `summary-${yesterday}`,
        });

        if (push.gone) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", device.endpoint);
        }
      }
    }
  }

  return NextResponse.json(
    {
      date: yesterday,
      clients: summaries.length,
      patterns: patterns.length,
      subject,
      results,
      failures,
    },
    { status: failures.length > 0 ? 500 : 200 },
  );
}
