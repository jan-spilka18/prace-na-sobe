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
  /**
   * Sekce ze staršího tvaru zápisu. V editoru se ukáže jen tehdy, když
   * v ní něco je, a klientovi se zobrazí dál — staré zápisy se nerozbijí.
   */
  legacy?: boolean;
};

/*
  Sekce podle Honzovy šablony zápisu („Šablona zápisu ze sezení — pro
  aplikaci Práce na sobě"): sedm pevných sekcí, vždy ve stejném pořadí.
  V tomhle pořadí je klient i čte.
*/
export const SESSION_SECTIONS: SessionSection[] = [
  {
    key: "summary",
    title: "Shrnutí sezení",
    hint: "4–6 vět: o čem jsme mluvili a kam se klient posunul.",
    aliases: [
      "shrnuti sezeni",
      "shrnuti",
      "souhrn",
      "o cem jsme mluvili",
      "co jsme resili",
      "prehled",
      "uvod",
      "summary",
    ],
  },
  {
    key: "key_points",
    title: "Hlavní body",
    aliases: [],
    legacy: true,
  },
  {
    key: "insights",
    title: "Klíčová uvědomění",
    hint: "2–4 odrážky, ideálně klientovými slovy v uvozovkách.",
    aliases: [
      "klicova uvedomeni",
      "uvedomeni",
      "klicove body",
      "hlavni body",
      "klicove myslenky",
      "hlavni myslenky",
      "postrehy",
      "poznatky",
      "insighty",
      "key points",
      "key takeaways",
      "highlights",
    ],
  },
  {
    key: "wins",
    title: "Co se povedlo",
    aliases: ["co se povedlo", "povedlo se", "uspechy", "vyhry", "wins"],
    legacy: true,
  },
  {
    key: "commitments",
    title: "Závazky a denní návyky",
    hint: "Denní návyky v 90denní výzvě:\n- …\nDalší závazky:\n- …",
    aliases: [
      "zavazky a denni navyky",
      "zavazky a navyky",
      "zavazky",
      "denni navyky",
      "navyky",
    ],
  },
  {
    key: "focus",
    title: "Fokus do příštího sezení",
    hint: "1–2 věty: na co se do příště soustředit.",
    aliases: [
      "fokus do pristiho sezeni",
      "fokus do priste",
      "fokus",
      "focus",
      "na cem chceme pracovat",
      "na cem budeme pracovat",
      "zamereni",
    ],
  },
  {
    key: "question",
    title: "Otázka k zamyšlení",
    hint: "Jedna otázka na dobu mezi sezeními.",
    aliases: [
      "otazka k zamysleni",
      "otazky k zamysleni",
      "otazka na zamysleni",
      "otazky na zamysleni",
      "otazka k premysleni",
      "otazky k premysleni",
      "otazka do priste",
      "otazky do priste",
      "otazka pro tebe",
      "reflexni otazka",
      "reflexni otazky",
      "k zamysleni",
      "k premysleni",
      "otazka",
      "otazky",
    ],
  },
  {
    key: "tasks",
    title: "Úkoly",
    hint: "Jeden úkol na řádek: Úkol — Kdo — Do kdy — Poznámka. Otázky a tipy aplikace přesune sama.",
    aliases: [
      "ukoly a doporuceni",
      "ukoly",
      "ukol",
      "ukoly do priste",
      "do priste",
      "dalsi kroky",
      "akcni kroky",
      "domaci ukol",
      "domaci ukoly",
      "co udelat",
      "action items",
      "next steps",
    ],
  },
  {
    key: "recommendations",
    title: "Nepovinná doporučení",
    hint: "Tipy mimo hlavní práci, třeba sportovní. Nejsou to úkoly.",
    aliases: [
      "nepovinna doporuceni",
      "doporuceni",
      "doporuceni do priste",
      "tipy",
      "tipy navic",
      "inspirace",
      "bonus",
    ],
  },
  {
    key: "links",
    title: "Odkazy a materiály",
    hint: "Jeden odkaz na řádek: Název — https://…",
    aliases: [
      "odkazy a materialy",
      "odkazy",
      "odkaz",
      "materialy",
      "materialy k sezeni",
      "videa a odkazy",
      "ke stazeni",
      "zdroje",
      "linky",
    ],
  },
];

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  coaching: "Koučink",
  breathwork: "Dech",
  monthly_review: "Reflexe měsíce",
  pregame: "Předzápasový hovor",
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

/**
 * Jak se klient po sezení cítí — ukládá se do sloupce feeling.
 *
 * Jen dobré stavy: otázka má klientovi pomoct pojmenovat, co mu sezení
 * dalo, ne hledat, co bylo špatně. Na to je hodnocení 1–10.
 */
export const FEEDBACK_MOODS = [
  "Nabitý",
  "Klidný",
  "Zamyšlený",
  "Motivovaný",
  "Inspirovaný",
  "Odhodlaný",
  "Uvolněný",
  "Vděčný",
  "S jasnou hlavou",
];

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
