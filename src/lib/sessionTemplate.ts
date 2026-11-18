import type { SessionKind } from "@/lib/database.types";
import {
  formatCzechDate,
  formatCzechDayMonth,
  formatCzechWeekday,
  todayISO,
} from "@/lib/date";

/**
 * Sekce zápisu ze sezení.
 *
 * Tohle je jediné místo, kde se struktura zápisu mění. Obsah se ukládá jako
 * jsonb pod těmito klíči, takže přidání nebo přejmenování sekce je úprava
 * tady — ne migrace databáze.
 *
 * Klíče se nemění: staré zápisy je mají uložené a přejmenování klíče by
 * jejich obsah odpojilo. Měnit se dá `title` i pořadí.
 */
export type SessionSection = {
  key: string;
  title: string;
  hint?: string;
  /**
   * Jak se sekce může jmenovat ve vloženém textu — malými písmeny a bez
   * diakritiky. Podle nich aplikace pozná nadpis a rozřadí text pod ním
   * (viz sessionSort.ts). Doplnit sem jde cokoli, co se v zápisech objeví.
   */
  aliases: string[];
};

/*
  Pořadí je i pořadí na stránce klienta: co se povedlo jde před úkoly,
  ať zápis nekončí seznamem povinností, ale tím, na čem se dál pracuje.
*/
export const SESSION_SECTIONS: SessionSection[] = [
  {
    key: "summary",
    title: "Shrnutí",
    hint: "Pár vět o tom, co jsme řešili.",
    aliases: [
      "shrnuti",
      "shrnuti sezeni",
      "souhrn",
      "o cem jsme mluvili",
      "co jsme resili",
      "prehled",
      "uvod",
      "kontext",
      "tema sezeni",
      "summary",
    ],
  },
  {
    key: "key_points",
    title: "Hlavní body",
    hint: "Co zaznělo a stojí za zapamatování.",
    aliases: [
      "hlavni body",
      "klicove body",
      "klicove myslenky",
      "hlavni myslenky",
      "dulezite body",
      "postrehy",
      "poznatky",
      "insighty",
      "co zaznelo",
      "key points",
      "key takeaways",
      "highlights",
    ],
  },
  {
    key: "wins",
    title: "Co se povedlo",
    aliases: [
      "co se povedlo",
      "povedlo se",
      "uspechy",
      "vyhry",
      "pokrok",
      "co funguje",
      "wins",
    ],
  },
  {
    key: "tasks",
    title: "Úkoly do příště",
    hint: "Na čem má klient do dalšího sezení pracovat.",
    aliases: [
      "ukoly do priste",
      "ukoly",
      "ukol",
      "do priste",
      "dalsi kroky",
      "akcni kroky",
      "domaci ukol",
      "domaci ukoly",
      "zavazky",
      "co udelat",
      "action items",
      "next steps",
    ],
  },
  {
    key: "focus",
    title: "Na čem chceme pracovat",
    aliases: [
      "na cem chceme pracovat",
      "na cem budeme pracovat",
      "na cem pracovat",
      "zamereni",
      "focus",
      "dalsi temata",
      "oblasti rozvoje",
      "vyzvy",
      "priste",
    ],
  },
];

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  coaching: "Koučink",
  breathwork: "Dech",
};

/** Sekce, které mají obsah — prázdné se klientovi nezobrazují. */
export function filledSections(
  content: Record<string, string>,
): Array<SessionSection & { body: string }> {
  return SESSION_SECTIONS.map((section) => ({
    ...section,
    body: (content[section.key] ?? "").trim(),
  })).filter((section) => section.body !== "");
}

/*
  Témata, ze kterých klient ve zpětné vazbě vybírá, co ho bavilo nejvíc.
  Ukládají se do obsahu sezení pod vlastním klíčem, po jednom na řádek —
  nejsou to sekce zápisu a klientovi se mezi nimi nezobrazují.
*/
export const TOPICS_KEY = "topics";
export const MAX_SESSION_TOPICS = 8;
export const MAX_TOPIC_LENGTH = 60;

export function sessionTopics(content: Record<string, string> | null): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const raw of (content?.[TOPICS_KEY] ?? "").split("\n")) {
    const topic = raw.trim().slice(0, MAX_TOPIC_LENGTH);
    if (topic === "" || seen.has(topic.toLowerCase())) continue;
    seen.add(topic.toLowerCase());
    topics.push(topic);
    if (topics.length === MAX_SESSION_TOPICS) break;
  }
  return topics;
}

/** Jak se klient po sezení cítí — ukládá se do sloupce feeling. */
export const FEEDBACK_MOODS = ["Nabitý", "Klidný", "Zamyšlený", "Unavený", "Zmatený"];

/**
 * Hlavička zápisu: „Středa 18. listopadu" a „Koučink · 3. sezení".
 * Rok jen u sezení z jiného roku. Stejná u klienta i v náhledu v adminu.
 */
export function sessionHeading(
  date: string,
  kind: SessionKind,
  order: number,
): { title: string; subtitle: string } {
  let title = formatCzechDate(date);
  if (date.slice(0, 4) === todayISO().slice(0, 4)) {
    const weekday = formatCzechWeekday(date);
    title = `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatCzechDayMonth(date)}`;
  }
  const subtitle = [SESSION_KIND_LABELS[kind], order > 0 ? `${order}. sezení` : null]
    .filter(Boolean)
    .join(" · ");
  return { title, subtitle };
}
