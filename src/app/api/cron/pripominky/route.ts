import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { cronAuthorized } from "@/lib/cron";
import { minutesSinceMidnight, todayISO } from "@/lib/date";
import { dueReminders, reminderBody, type RemindableHabit } from "@/lib/reminders";
import { pushConfigured, sendPush } from "@/lib/push";

// web-push je knihovna pro Node, na Edge runtime neběží.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Jak daleko zpět se hledají připomínky, kterým už nastal čas.
 *
 * Musí být aspoň tak velké, jak často cron běží — jinak by se při hodinovém
 * plánu poslala jen ta připomínka, která padla přesně do dané minuty.
 */
const WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES ?? 70);

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Nepovoleno." }, { status: 401 });
  }

  if (!pushConfigured()) {
    return NextResponse.json(
      { skipped: "Chybí klíče VAPID." },
      { status: 200 },
    );
  }

  const supabase = createAdminClient();
  const date = todayISO();
  const nowMinutes = minutesSinceMidnight();

  /*
    Chyba dotazu se nesmí tvářit jako prázdný výsledek.

    Kdyby se `error` přešel a pokračovalo se s prázdným polem, výpadek
    databáze by skončil odpovědí „nikdo neodebírá" a stavem 200 — tedy
    tichem. U notifikací je tiché selhání to nejhorší: nikdo se nedozví,
    že celý den nic neodešlo.
  */
  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("*");

  if (subsError) {
    return NextResponse.json(
      { error: `Odběry se nepodařilo načíst: ${subsError.message}` },
      { status: 500 },
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, reason: "Nikdo neodebírá." });
  }

  const { data: settings, error: settingsError } = await supabase
    .from("notification_settings")
    .select("user_id, push_enabled");

  if (settingsError) {
    return NextResponse.json(
      { error: `Nastavení se nepodařilo načíst: ${settingsError.message}` },
      { status: 500 },
    );
  }

  const pushOff = new Set(
    (settings ?? [])
      .filter((row) => !row.push_enabled)
      .map((row) => row.user_id),
  );

  const byUser = new Map<string, typeof subscriptions>();
  for (const subscription of subscriptions) {
    if (pushOff.has(subscription.user_id)) continue;
    const list = byUser.get(subscription.user_id) ?? [];
    list.push(subscription);
    byUser.set(subscription.user_id, list);
  }

  let sent = 0;
  let skipped = 0;

  const failures: string[] = [];

  for (const [userId, devices] of byUser) {
    const { data: habits, error: habitsError } = await supabase
      .from("habits")
      .select("id, title, weekdays, reminder_enabled, reminder_time, archived_at")
      .eq("client_id", userId)
      .eq("reminder_enabled", true);

    if (habitsError) {
      // Jeden klient navíc neshodí zbytek fronty, ale selhání se nesmí ztratit.
      failures.push(`${userId}: ${habitsError.message}`);
      continue;
    }
    if (!habits || habits.length === 0) continue;

    // Co už je na dnešek vyplněné, se nepřipomíná.
    const { data: entries, error: entriesError } = await supabase
      .from("habit_entries")
      .select("habit_id")
      .eq("client_id", userId)
      .eq("entry_date", date);

    if (entriesError) {
      /*
        Bez záznamů by se každý návyk tvářil jako nevyplněný a klient by
        dostal připomínku na něco, co má dávno hotové. Radši nic.
      */
      failures.push(`${userId}: ${entriesError.message}`);
      continue;
    }

    const filled = new Set((entries ?? []).map((entry) => entry.habit_id));

    const candidates: RemindableHabit[] = habits.map((habit) => ({
      ...habit,
      filled: filled.has(habit.id),
    }));

    const due = dueReminders(candidates, date, nowMinutes, WINDOW_MINUTES);
    if (due.length === 0) continue;

    /*
      Zámek proti dvojímu odeslání. Unikátní dedupe_key znamená, že druhý
      pokus o zápis selže — a když selže, notifikace se neposílá. Kdyby se
      logovalo až po odeslání, spuštění dvou cronů přes sebe by klientovi
      poslalo každou připomínku dvakrát.
    */
    const dedupeKey = `reminder:${userId}:${date}:${due
      .map((habit) => habit.id)
      .sort()
      .join(",")}`;

    const { error: lockError } = await supabase.from("notification_log").insert({
      user_id: userId,
      kind: "habit_reminder",
      channel: "push",
      dedupe_key: dedupeKey,
      payload: { habits: due.map((habit) => habit.id), date },
    });

    if (lockError) {
      skipped++;
      continue;
    }

    for (const device of devices) {
      const result = await sendPush(device, {
        title: due.length === 1 ? "Připomínka" : "Připomínka na dnešek",
        body: reminderBody(due),
        url: "/",
        tag: `reminder-${date}`,
      });

      if (result.ok) sent++;
      if (result.gone) {
        // Mrtvý odběr: aplikace je odinstalovaná nebo notifikace vypnuté.
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", device.endpoint);
      }
    }
  }

  return NextResponse.json(
    { date, nowMinutes, sent, skipped, failures },
    { status: failures.length > 0 ? 500 : 200 },
  );
}
