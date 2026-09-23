import type { SessionKind } from "@/lib/database.types";

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
};

export const SESSION_SECTIONS: SessionSection[] = [
  {
    key: "summary",
    title: "Shrnutí",
    hint: "Pár vět o tom, co jsme řešili.",
  },
  {
    key: "key_points",
    title: "Hlavní body",
    hint: "Co zaznělo a stojí za zapamatování.",
  },
  {
    key: "tasks",
    title: "Úkoly do příště",
    hint: "Na čem má klient do dalšího sezení pracovat.",
  },
  {
    key: "wins",
    title: "Co se povedlo",
  },
  {
    key: "focus",
    title: "Na čem chceme pracovat",
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
