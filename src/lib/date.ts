import { TIMEZONE } from "@/lib/config";

/**
 * Datum v pásmu Europe/Prague jako YYYY-MM-DD.
 *
 * Server na Vercelu běží v UTC, takže `new Date().toISOString()` by po 22:00
 * (v létě po 23:00) vrátil už zítřejší den. Proto se datum vždy odvozuje
 * přes Intl, ne z UTC.
 */
export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function toISODate(date: Date): string {
  // en-CA dává rovnou formát YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Počet minut po půlnoci v pásmu Europe/Prague. Pro porovnání s časem připomínky. */
export function minutesSinceMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

/**
 * Posun o dny nad kalendářním datem.
 *
 * Počítá se v UTC poledne, aby přechod na letní čas neposunul výsledek
 * o den zpět nebo vpřed.
 */
export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d, 12);
  const shifted = new Date(base + days * 86_400_000);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split("-").map(Number);
  const [ty, tm, td] = toISO.split("-").map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

/** Kolikátý den programu připadá na dané datum. První den je 1. */
export function programDay(startDate: string, onDate: string): number {
  return daysBetween(startDate, onDate) + 1;
}

/**
 * Den programu omezený na jeho rozsah — pro hlavičku „Den X z 90".
 * Před začátkem vrací 0, po konci poslední den.
 */
export function clampedProgramDay(
  startDate: string,
  durationDays: number,
  onDate: string,
): number {
  const day = programDay(startDate, onDate);
  if (day < 1) return 0;
  return Math.min(day, durationDays);
}

const WEEKDAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
const MONTHS = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

export function formatCzechDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]} ${y}`;
}

/** Pořadí dne v týdnu, kde pondělí je 0 — mřížka začíná pondělkem. */
export function weekdayIndex(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/**
 * Den v týdnu podle ISO: 1 = pondělí … 7 = neděle.
 *
 * Stejné číslování používá `extract(isodow from date)` v databázi, takže
 * se rozvrh návyku nikde nepřepočítává.
 */
export function isoWeekday(isoDate: string): number {
  return weekdayIndex(isoDate) + 1;
}

export function formatCzechWeekday(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** „23. září" — bez roku. Do hlavičky, kde rok nic nepřidává. */
export function formatCzechDayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d}. ${MONTHS[m - 1]}`;
}

export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split("-").map(Number);
  return `${d}. ${m}.`;
}

/** „dnes", „včera" nebo datum. Pro hlavičku denního přehledu. */
export function describeDay(isoDate: string, today = todayISO()): string {
  const diff = daysBetween(isoDate, today);
  if (diff === 0) return "dnes";
  if (diff === 1) return "včera";
  if (diff === 2) return "předevčírem";
  return formatCzechDate(isoDate);
}
