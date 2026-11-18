import { parseCzechDate, plainLabel } from "@/lib/sessionText";

/*
  Úkoly ze zápisu ze sezení.

  Šablona píše úkol jako „Úkol — Kdo — Do kdy — Poznámka", ale skutečné
  zápisy se od ní odchylují: svislítka, tabulka, „Kdo: Martin, Do kdy:
  pátek", nebo jen holá věta. Proto se části nepřiřazují podle pořadí,
  ale podle toho, jak vypadají: datum nebo „do pátku" je termín, jméno
  nebo „Honza" je kdo, zbytek je poznámka. Úkol je vždy první část.

  Řádky, které úkolem nejsou, se při rozřazení přesunou jinam: otázka
  (končí otazníkem) k otázce k zamyšlení, tip („Zkus…", „Doporučuji…")
  k doporučením. Viz refineTasks.
*/

export type WhoKind = "client" | "coach" | "both" | "";

export type SessionTask = {
  task: string;
  /** Jak to stojí v zápisu. */
  who: string;
  whoKind: WhoKind;
  /** Pro klienta čitelný termín: „do 26. 11.", „termín upřesníme", „do pátku". */
  due: string;
  note: string;
};

const ITEM = /^\s*([-*•]|\d+[.)]|\[[ xX]?\])\s*/;
const SEPARATOR = /\s+[—–]\s+|\s*\|\s*/;
const HEADER_WORDS = ["ukol", "ukoly", "kdo", "do kdy", "termin", "poznamka", "kdy"];

/* ─── Části řádku ──────────────────────────────────────────────────────── */

function whoKind(part: string): WhoKind | null {
  const name = plainLabel(part);
  if (name === "") return null;
  if (/\b(spolu|spolecne|oba|obe)\b|honza a |a honza|s honzou/.test(name)) return "both";
  if (/^(honza|kouc)/.test(name)) return "coach";
  if (/^(klient|ty)$/.test(name)) return "client";
  // Jméno klienta: jedno až tři slova s velkým písmenem, bez číslic.
  if (/^\p{Lu}[\p{L}.-]*(\s\p{Lu}[\p{L}.-]*){0,2}$/u.test(part.trim())) return "client";
  return null;
}

const DUE_WORDS =
  /\b(pondeli|utery|stred[ay]|ctvrt(ek|ka)|pat(ek|ku)|sobot[ay]|nedel[ei]|tyden|tydne|tydnu|zitra|dnes|pristi|pristiho|priste|sezeni|mesic|mesice|konce|vikend|vikendu|rana|vecera)\b/;

function isDue(part: string): boolean {
  const name = plainLabel(part);
  if (name === "") return false;
  if (parseCzechDate(part) || /^\d{1,2}\.\s*\d{1,2}\.?$/.test(part.trim())) return true;
  if (name.includes("overeni") || name.includes("upresni")) return true;
  if (/^(do|nejpozdeji|termin|deadline|kazdy|kazdou|denne|tydne)\b/.test(name)) return true;
  return DUE_WORDS.test(name) && name.split(" ").length <= 5;
}

function formatDue(part: string): string {
  const text = part.trim();
  const name = plainLabel(text);
  if (name.includes("overeni") || name.includes("upresni")) return "termín upřesníme";

  const iso = parseCzechDate(text);
  if (iso) {
    const [, m, d] = iso.split("-").map(Number);
    return `do ${d}. ${m}.`;
  }
  const short = text.match(/^(\d{1,2})\.\s*(\d{1,2})\.?$/);
  if (short) return `do ${Number(short[1])}. ${Number(short[2])}.`;
  return text;
}

/** Popisky uvnitř řádku: „(kdo: Martin, do kdy: pátek)". */
const LABELED = [
  { field: "who", re: /\b(kdo|zodpov[ií]d[aá]|odpov[eě]dn[yý])\s*:\s*([^,;|)\]]+)/i },
  { field: "due", re: /\b(do kdy|term[ií]n|deadline|kdy)\s*:\s*([^,;|)\]]+)/i },
  { field: "note", re: /\b(pozn[aá]mka|pozn\.)\s*:\s*(.+)$/i },
] as const;

/* ─── Jeden řádek ──────────────────────────────────────────────────────── */

export function parseTaskLine(line: string): SessionTask | null {
  let text = line.replace(ITEM, "").replace(/^\s*[ÚU]kol\s*:\s*/i, "").trim();
  if (text === "" || /^-{3,}$/.test(text)) return null;

  let parts: string[];

  if (text.startsWith("|")) {
    // Řádek tabulky. Oddělovač pod hlavičkou ani hlavička nejsou úkol.
    parts = text.split("|").map((cell) => cell.trim()).filter(Boolean);
    if (parts.every((cell) => /^:?-{2,}:?$/.test(cell))) return null;
  } else {
    const fields: Record<string, string> = {};
    for (const { field, re } of LABELED) {
      const match = text.match(re);
      if (match) {
        fields[field] = match[2].trim();
        text = text.replace(match[0], "");
      }
    }
    // Po vyjmutí popisků zůstanou prázdné závorky a osiřelé oddělovače.
    text = text
      .replace(/\(\s*[,;]*\s*\)|\[\s*[,;]*\s*\]/g, "")
      .replace(/[\s,;—–-]+$/, "")
      .trim();

    parts = text.split(SEPARATOR).map((part) => part.trim());
    // Obyčejná pomlčka odděluje části jen tehdy, když dělí víc kusů:
    // „Do postele ve 23:00 - aspoň 5 večerů" je jedna věta.
    if (parts.length === 1) {
      const dashed = text.split(/\s+-\s+/).map((part) => part.trim());
      if (dashed.length >= 3 || (dashed.length === 2 && isDue(dashed[1]))) parts = dashed;
    }
    if (fields.who) parts.push(fields.who);
    if (fields.due) parts.push(fields.due);
    if (fields.note) parts.push(fields.note);
  }

  parts = parts.filter((part) => part !== "" && !/^[—–-]+$/.test(part));
  if (parts.length === 0) return null;
  if (parts.every((part) => HEADER_WORDS.includes(plainLabel(part)))) return null;

  const [task, ...rest] = parts;
  let who = "";
  let kind: WhoKind = "";
  let due = "";
  const notes: string[] = [];

  for (const part of rest) {
    const partKind = whoKind(part);
    if (!due && isDue(part)) due = formatDue(part);
    else if (!who && partKind) {
      who = part;
      kind = partKind;
    } else notes.push(part);
  }

  return { task, who, whoKind: kind, due, note: notes.join(" · ") };
}

/* ─── Celá sekce ───────────────────────────────────────────────────────── */

/**
 * Úkoly ze sekce. Krátký řádek s dvojtečkou („Honza:", „Martin:") je
 * podnadpis skupiny: úkolům pod ním, které kdo neuvádějí, ho doplní.
 */
export function parseTasks(body: string): SessionTask[] {
  const tasks: SessionTask[] = [];
  let groupWho: { who: string; kind: WhoKind } | null = null;

  for (const line of body.split("\n")) {
    const text = line.replace(ITEM, "").trim();
    if (text.endsWith(":") && text.length <= 40 && !SEPARATOR.test(text)) {
      const label = text.slice(0, -1);
      const kind = whoKind(label);
      groupWho = kind ? { who: label, kind } : null;
      continue;
    }

    const task = parseTaskLine(line);
    if (!task) continue;
    if (!task.whoKind && groupWho) {
      task.who = groupWho.who;
      task.whoKind = groupWho.kind;
    }
    tasks.push(task);
  }

  return tasks;
}

/* ─── Úkol, doporučení, nebo otázka ────────────────────────────────────── */

const RECOMMENDATION =
  /^(doporuc|zkus|muzes|tip\b|nepovinn|volitelne|pokud chces|pokud budes|kdyz budes|kdyz bys|inspirace|bonus|stoji za|zvaz|klidne|idealne)/;

/** Má úkol termín nebo toho, kdo ho dělá? Pak je to úkol, ne tip. */
function hasStructure(line: string): boolean {
  const task = parseTaskLine(line);
  return Boolean(task && (task.due || task.whoKind));
}

function isRecommendation(line: string): boolean {
  const name = plainLabel(line.replace(ITEM, ""));
  return (
    (RECOMMENDATION.test(name) || /\((nepovinne|volitelne)\)/.test(name)) &&
    !hasStructure(line)
  );
}

function isQuestion(line: string): boolean {
  return line.replace(ITEM, "").trim().endsWith("?");
}

/**
 * Doladí rozřazení úkolů: otázky z úkolů přesune k otázce k zamyšlení,
 * tipy k doporučením, a z doporučení naopak vrátí to, co má termín nebo
 * kdo — to je úkol.
 */
export function refineTasks(content: Record<string, string>): Record<string, string> {
  const tasks: string[] = [];
  const moved = { question: [] as string[], recommendations: [] as string[] };

  for (const line of (content.tasks ?? "").split("\n")) {
    if (line.trim() === "") tasks.push(line);
    else if (isQuestion(line)) moved.question.push(line.replace(ITEM, "").trim());
    else if (isRecommendation(line)) moved.recommendations.push(line);
    else tasks.push(line);
  }

  const recommendations: string[] = [];
  for (const line of (content.recommendations ?? "").split("\n")) {
    if (line.trim() !== "" && hasStructure(line)) tasks.push(line);
    else recommendations.push(line);
  }

  const join = (...chunks: string[]) =>
    chunks
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .join("\n");

  return {
    ...content,
    tasks: join(tasks.join("\n")),
    question: join(content.question ?? "", moved.question.join("\n")),
    recommendations: join(recommendations.join("\n"), moved.recommendations.join("\n")),
  };
}
