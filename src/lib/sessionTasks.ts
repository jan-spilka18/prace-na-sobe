import { parseCzechDate, plainLabel } from "@/lib/sessionSort";

/*
  Úkoly ze zápisu podle Honzovy šablony: jeden úkol na řádek ve tvaru
  „Úkol — Kdo — Do kdy — Poznámka" (části odděluje dlouhá pomlčka).
  „Kdo" je jméno klienta, nebo Honza. „Do kdy" je datum DD.MM.RRRR, nebo
  „k ověření", když termín na sezení nezazněl.

  Řádek, který tenhle tvar nemá (starší zápisy s odrážkami), se nezahodí:
  vrátí se v `rest` a vykreslí jako běžný text.
*/

export type SessionTask = {
  task: string;
  who: string;
  /** Úkol má na starosti Honza, ne klient. */
  byCoach: boolean;
  /** Pro klienta čitelný termín: „do 26. 11.", „termín upřesníme", nebo nic. */
  due: string;
  note: string;
};

const SEPARATOR = /\s+[—–]\s+/;

export function parseTaskLine(line: string): SessionTask | null {
  const clean = line.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim();
  if (!SEPARATOR.test(clean)) return null;

  const [task = "", who = "", due = "", ...note] = clean
    .split(SEPARATOR)
    .map((part) => part.trim());
  if (task === "") return null;

  // Prázdná poznámka na konci řádku nechá po sobě „—" bez textu.
  const noteText = note.join(" — ").replace(/[—–]\s*$/, "").trim();
  const dueText = due.replace(/[—–]\s*$/, "").trim();
  const name = plainLabel(who);

  return {
    task,
    who: who.replace(/[—–]\s*$/, "").trim(),
    byCoach: name.startsWith("honza") || name.startsWith("kouc"),
    due: formatDue(dueText),
    note: noteText,
  };
}

function formatDue(value: string): string {
  if (value === "") return "";
  if (plainLabel(value).includes("overeni")) return "termín upřesníme";
  const iso = parseCzechDate(value);
  if (!iso) return value;
  const [, m, d] = iso.split("-").map(Number);
  return `do ${d}. ${m}.`;
}

export function parseTasks(body: string): { tasks: SessionTask[]; rest: string } {
  const tasks: SessionTask[] = [];
  const rest: string[] = [];

  for (const line of body.split("\n")) {
    const task = parseTaskLine(line);
    if (task) tasks.push(task);
    else rest.push(line);
  }

  return { tasks, rest: rest.join("\n").trim() };
}
