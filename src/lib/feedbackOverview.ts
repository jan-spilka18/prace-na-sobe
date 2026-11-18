import { addDays } from "@/lib/date";

/*
  Souhrn zpětné vazby pro admina: jak klienti hodnotí sezení.
  Čisté výpočty bez databáze, ať jdou otestovat.
*/

export type FeedbackForOverview = {
  rating?: number | null;
  created_at: string;
};

export type FeedbackSummary = {
  count: number;
  /** Průměr hodnocení na jedno desetinné místo, null když nikdo nehodnotil. */
  average: number | null;
  /** Odpovědi za posledních 7 dní. */
  lastWeek: number;
};

export function summarizeFeedback(
  rows: FeedbackForOverview[],
  today: string,
): FeedbackSummary {
  const ratings = rows
    .map((row) => row.rating)
    .filter((rating): rating is number => typeof rating === "number");

  const average =
    ratings.length === 0
      ? null
      : Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10;

  const weekAgo = addDays(today, -6);
  const lastWeek = rows.filter((row) => row.created_at.slice(0, 10) >= weekAgo).length;

  return { count: rows.length, average, lastWeek };
}

/** „8,4" — česká desetinná čárka. */
export function formatRating(value: number): string {
  return value.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
}
