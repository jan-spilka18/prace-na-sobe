import { WEEKDAY_SHORT } from "@/lib/habits";
import { isoWeekday } from "@/lib/date";

/*
  Ranní vyhodnocení předchozího dne.

  Tohle není statistika pro statistiku — Honza dostane jednu zprávu denně
  a má z ní poznat, komu zavolat. Proto se nepočítají procenta za celý
  program, ale hledají se věci, které se mění k horšímu.
*/

export type DayOutcome = {
  date: string;
  /** Návyk na ten den připadal a je odškrtnutý jako splněný. */
  done: number;
  /** Označený jako nesplněný. */
  missed: number;
  /** Vůbec nevyplněný. */
  empty: number;
};

export type ClientSummary = {
  clientId: string;
  name: string;
  outcome: DayOutcome;
  /** Kolik dní po sobě je splněných, včetně vyhodnocovaného. */
  streak: number;
};

export type Pattern = {
  clientId: string;
  name: string;
  text: string;
};

/** Den, na který klientovi nepřipadal žádný návyk. */
export function isRestDay(outcome: DayOutcome): boolean {
  return outcome.done + outcome.missed + outcome.empty === 0;
}

export function describeOutcome(outcome: DayOutcome): string {
  if (isRestDay(outcome)) return "volno";

  const total = outcome.done + outcome.missed + outcome.empty;
  if (outcome.done === total) return `${total} z ${total}`;
  if (outcome.empty === total) return "nevyplněno";

  return `${outcome.done} z ${total}`;
}

/**
 * Tichý klient: nevyplnil vůbec nic několik dní po sobě.
 *
 * Nevyplněno je jiná věc než nesplněno. Kdo pravdivě přizná, že návyk
 * nestihl, pracuje dál. Kdo přestal appku otevírat, vypadl — a to je
 * okamžik, kdy má smysl se ozvat.
 */
export function silentDays(history: DayOutcome[]): number {
  let days = 0;

  // Od nejnovějšího dne zpět.
  for (let i = history.length - 1; i >= 0; i--) {
    const day = history[i];
    if (isRestDay(day)) continue; // volno mlčení nezakládá
    if (day.done > 0 || day.missed > 0) break;
    days++;
  }

  return days;
}

/**
 * Den v týdnu, který klientovi opakovaně nevychází.
 *
 * Hlásí se až od tří výskytů a jen když ten den selhal pokaždé — dvakrát
 * je náhoda, a upozornění, které se ozve na každou výjimku, se přestane číst.
 */
export function weakWeekday(history: DayOutcome[]): string | null {
  const byWeekday = new Map<number, { total: number; failed: number }>();

  for (const day of history) {
    if (isRestDay(day)) continue;

    const weekday = isoWeekday(day.date);
    const bucket = byWeekday.get(weekday) ?? { total: 0, failed: 0 };
    bucket.total++;
    if (day.missed > 0 || day.empty > 0) bucket.failed++;
    byWeekday.set(weekday, bucket);
  }

  for (const [weekday, bucket] of byWeekday) {
    if (bucket.total >= 3 && bucket.failed === bucket.total) {
      return WEEKDAY_SHORT[weekday - 1];
    }
  }

  return null;
}

/** Upozornění pro jednoho klienta. Prázdné pole znamená, že je všechno v pořádku. */
export function patternsFor(
  clientId: string,
  name: string,
  history: DayOutcome[],
): Pattern[] {
  const found: Pattern[] = [];

  const silent = silentDays(history);
  if (silent >= 3) {
    found.push({
      clientId,
      name,
      text: `${name} ${silent} dní nic nevyplnil/a.`,
    });
  }

  const weekday = weakWeekday(history);
  if (weekday) {
    found.push({
      clientId,
      name,
      text: `${name}: ${weekday} nevychází opakovaně.`,
    });
  }

  return found;
}

/** Předmět e-mailu. Musí se dát přečíst na zamčeném displeji. */
export function summarySubject(
  summaries: ClientSummary[],
  patterns: Pattern[],
): string {
  const active = summaries.filter((s) => !isRestDay(s.outcome));
  const complete = active.filter((s) => s.outcome.missed + s.outcome.empty === 0);

  if (patterns.length > 0) {
    return `Včera: ${complete.length} z ${active.length} a ${patterns.length} upozornění`;
  }

  return `Včera: ${complete.length} z ${active.length} splnilo všechno`;
}
