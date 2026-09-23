import { escapeHtml } from "@/lib/email";
import { describeOutcome, isRestDay, type ClientSummary, type Pattern } from "@/lib/summary";
import { formatCzechDate } from "@/lib/date";

/**
 * Tělo ranního souhrnu.
 *
 * Upozornění jsou nahoře, seznam klientů pod nimi. Kdo zprávu čte v šest
 * ráno jedním okem, má nejdřív vidět, jestli se něco děje.
 */
export function summaryText(
  date: string,
  summaries: ClientSummary[],
  patterns: Pattern[],
): string {
  const lines: string[] = [`Souhrn za ${formatCzechDate(date)}`, ""];

  if (patterns.length > 0) {
    lines.push("Stojí za pozornost:");
    for (const pattern of patterns) lines.push(`- ${pattern.text}`);
    lines.push("");
  }

  for (const summary of summaries) {
    const streak =
      summary.streak >= 2 && !isRestDay(summary.outcome)
        ? ` · ${summary.streak} dní v řadě`
        : "";
    lines.push(`${summary.name}: ${describeOutcome(summary.outcome)}${streak}`);
  }

  if (summaries.length === 0) lines.push("Zatím žádní klienti s programem.");

  return lines.join("\n");
}

export function summaryHtml(
  date: string,
  summaries: ClientSummary[],
  patterns: Pattern[],
  appUrl: string,
): string {
  const rows = summaries
    .map((summary) => {
      const rest = isRestDay(summary.outcome);
      const failed =
        !rest && summary.outcome.missed + summary.outcome.empty > 0;

      const streak =
        summary.streak >= 2 && !rest
          ? `<span style="color:#8e8e93"> · ${summary.streak} dní v řadě</span>`
          : "";

      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5ea">${escapeHtml(summary.name)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e5ea;text-align:right;color:${
          rest ? "#8e8e93" : failed ? "#171717" : "#0f8a95"
        };font-weight:600">${escapeHtml(describeOutcome(summary.outcome))}${streak}</td>
      </tr>`;
    })
    .join("");

  const alerts =
    patterns.length === 0
      ? ""
      : `<div style="background:#FFF0A6;border-radius:12px;padding:14px 16px;margin:0 0 20px">
           <div style="font-weight:700;margin-bottom:6px">Stojí za pozornost</div>
           ${patterns
             .map(
               (pattern) =>
                 `<div style="margin:3px 0">${escapeHtml(pattern.text)}</div>`,
             )
             .join("")}
         </div>`;

  return `<!doctype html>
<html lang="cs"><body style="margin:0;background:#f2f2f7;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#171717">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:24px">
    <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#8e8e93">Souhrn</div>
    <h1 style="margin:4px 0 20px;font-size:24px">${escapeHtml(formatCzechDate(date))}</h1>
    ${alerts}
    <table style="width:100%;border-collapse:collapse;font-size:16px">${rows}</table>
    <a href="${escapeHtml(appUrl)}" style="display:inline-block;margin-top:24px;background:#5FC3CE;color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">Otevřít aplikaci</a>
  </div>
</body></html>`;
}
