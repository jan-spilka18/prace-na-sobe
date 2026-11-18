import { addDays } from "@/lib/date";

/*
  Souhrn zpětné vazby pro admina: jak klienti hodnotí sezení a co je baví.
  Čisté výpočty bez databáze, ať jdou otestovat.
*/

export type FeedbackForOverview = {
  rating?: number | null;
  favorite_topic?: string;
  created_at: string;
};

export type FeedbackSummary = {
  count: number;
  /** Průměr hodnocení na jedno desetinné místo, null když nikdo nehodnotil. */
  average: number | null;
  /** Odpovědi za posledních 7 dní. */
  lastWeek: number;
  /** Nejčastější oblíbená témata, nejvýš tři. */
  topTopics: Array<{ topic: string; count: number }>;
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

  // Témata se sčítají bez ohledu na velikost písmen; zobrazí se tak,
  // jak je někdo napsal poprvé.
  const topics = new Map<string, { topic: string; count: number }>();
  for (const row of rows) {
    const topic = (row.favorite_topic ?? "").trim();
    if (topic === "") continue;
    const key = topic.toLowerCase();
    const entry = topics.get(key) ?? { topic, count: 0 };
    entry.count += 1;
    topics.set(key, entry);
  }

  const topTopics = [...topics.values()]
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic, "cs"))
    .slice(0, 3);

  return { count: rows.length, average, lastWeek, topTopics };
}

/** „8,4" — česká desetinná čárka. */
export function formatRating(value: number): string {
  return value.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });
}
