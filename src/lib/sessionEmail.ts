import { escapeHtml } from "@/lib/email";
import { parseInline, parseMarkdown, plainText, type InlineToken } from "@/lib/markdown";
import { filledSections, sessionHeading } from "@/lib/sessionTemplate";
import { parseTasks, refineTasks, type SessionTask } from "@/lib/sessionTasks";
import { formatShortDate } from "@/lib/date";
import type { SessionKind } from "@/lib/database.types";

/*
  E-mail se zápisem ze sezení.

  Vypadá jako zápis v aplikaci: černá hlavička, tyrkysový fokus, žlutá
  otázka, úkoly s termíny. Dole jsou čísla 1–10 — klik na číslo otevře
  aplikaci s vybraným hodnocením, takže zpětná vazba je na jeden dotek.

  E-mailové aplikace (hlavně Gmail a Outlook) neumí moderní CSS. Proto
  tabulky a styly přímo na prvcích. Soukromá poznámka pro Honzu tu být
  nemůže: leží v jiné tabulce a do `content` se nikdy nedostane.
*/

const C = {
  canvas: "#f2f2f7",
  surface: "#ffffff",
  ink: "#171717",
  ink2: "#3a3a3c",
  muted: "#8a8a8e",
  turquoise: "#5fc3ce",
  turquoise100: "#dff4f6",
  turquoise700: "#1f5f67",
  sun: "#fff0a6",
  sun700: "#8a7b21",
  night: "#171717",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "Montserrat,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

export type SessionEmailInput = {
  sessionId: string;
  date: string;
  kind: SessionKind;
  /** Kolikáté sezení klienta to je (1 = první); 0 = nevíme. */
  order: number;
  content: Record<string, string>;
  /** Adresa aplikace bez lomítka na konci, např. https://prace-na-sobe.vercel.app */
  appUrl: string;
};

export type SessionEmail = { subject: string; html: string; text: string };

export function sessionEmail(input: SessionEmailInput): SessionEmail {
  const content = refineTasks(input.content);
  const sections = filledSections(content);
  const heading = sessionHeading(input.date, input.kind, input.order);
  const focus = (content.focus ?? "").trim();

  const sessionUrl = `${input.appUrl}/sezeni/${input.sessionId}`;
  const feedbackUrl = (rating?: number) =>
    `${sessionUrl}${rating ? `?hodnoceni=${rating}` : ""}#zpetna-vazba`;

  const subject =
    `Zápis z našeho sezení ${formatShortDate(input.date)}` +
    (focus ? " – tvůj fokus do příště" : "");

  const blocks: string[] = [];

  blocks.push(
    card(
      C.night,
      `${brand()}
      ${eyebrow(`Zápis ze sezení · ${heading.title}`, C.sun)}
      <h1 style="margin:6px 0 0;font-family:${DISPLAY};font-size:28px;line-height:1.15;font-weight:800;color:#ffffff">${escapeHtml(heading.subtitle || "Sezení")}</h1>
      <p style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:#d1d1d6">Ahoj, díky za dnešek. Tady máš všechno, na čem jsme se domluvili, ať to máš po ruce.</p>`,
    ),
  );

  if (focus) {
    blocks.push(
      card(
        C.turquoise,
        `${eyebrow("Tvůj fokus do příštího sezení", C.ink)}
        <div style="margin-top:8px">${markdownHtml(focus, C.ink, { font: DISPLAY, size: 21, weight: 800, lineHeight: 1.3 })}</div>`,
      ),
    );
  }

  let tasksDone = false;
  for (const section of sections) {
    if (section.key === "focus") continue;

    if (section.key === "question") {
      blocks.push(
        card(
          C.sun,
          `${eyebrow(section.title, C.sun700)}
          <div style="margin-top:8px">${markdownHtml(section.body, C.ink, { font: DISPLAY, size: 18, weight: 700, lineHeight: 1.4 })}</div>`,
        ),
      );
      continue;
    }

    if (section.key === "tasks" || section.key === "recommendations") {
      if (tasksDone) continue;
      tasksDone = true;
      const html = tasksHtml(content.tasks ?? "", content.recommendations ?? "");
      if (html) blocks.push(card(C.surface, html));
      continue;
    }

    blocks.push(
      card(
        C.surface,
        `<h2 style="margin:0 0 10px;font-family:${DISPLAY};font-size:18px;font-weight:800;color:${C.ink}">${escapeHtml(section.title)}</h2>
        ${markdownHtml(section.body, C.ink2)}`,
      ),
    );
  }

  blocks.push(feedbackCard(feedbackUrl));

  blocks.push(`<tr><td style="padding:8px 12px 0;text-align:center">
    <a href="${escapeHtml(sessionUrl)}" style="font-family:${FONT};font-size:15px;font-weight:700;color:${C.turquoise700};text-decoration:none">Otevřít zápis v aplikaci</a>
    <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">Tenhle e-mail ti přišel, protože ti Honza zveřejnil zápis ze sezení v aplikaci Práce na sobě.</p>
  </td></tr>`);

  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(focus ? plainText(focus) : "Zápis z našeho sezení")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas}">
<tr><td align="center" style="padding:16px 10px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
${blocks.join("\n<tr><td style=\"height:12px;line-height:12px;font-size:0\">&nbsp;</td></tr>\n")}
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, html, text: textVersion(heading, sections, sessionUrl, feedbackUrl()) };
}

/* ─── Stavební kostky ─────────────────────────────────────────── */

function card(background: string, inner: string): string {
  return `<tr><td style="background:${background};border-radius:22px;padding:20px">${inner}</td></tr>`;
}

function eyebrow(text: string, color: string): string {
  return `<div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:${color}">${escapeHtml(text)}</div>`;
}

function brand(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px"><tr>
    <td style="width:26px;height:26px;background:${C.turquoise};border-radius:8px;text-align:center;font-size:15px;line-height:26px">☀︎</td>
    <td style="padding-left:8px;font-family:${DISPLAY};font-size:14px;font-weight:800;color:#ffffff">Práce na sobě</td>
  </tr></table>`;
}

function inlineHtml(tokens: InlineToken[]): string {
  return tokens
    .map((token) =>
      token.kind === "strong"
        ? `<strong>${escapeHtml(token.text)}</strong>`
        : token.kind === "em"
          ? `<em>${escapeHtml(token.text)}</em>`
          : escapeHtml(token.text),
    )
    .join("");
}

function markdownHtml(
  source: string,
  color: string,
  look: { font?: string; size?: number; weight?: number; lineHeight?: number } = {},
): string {
  const base = `font-family:inherit;font-size:inherit;line-height:inherit;color:${color}`;
  const body = parseMarkdown(source)
    .map((block) => {
      if (block.kind === "paragraph") {
        return `<p style="margin:0 0 10px;${base}">${block.lines.map(inlineHtml).join("<br>")}</p>`;
      }
      return block.items
        .map(
          (item, index) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr>
            <td valign="top" style="width:20px;padding-top:${block.kind === "bullets" ? "8px" : "0"};font-family:${FONT};font-size:14px;font-weight:800;color:${C.turquoise700}">${
              block.kind === "bullets"
                ? `<div style="width:6px;height:6px;border-radius:3px;background:${C.turquoise}"></div>`
                : `${index + 1}.`
            }</td>
            <td style="${base}">${inlineHtml(item)}</td>
          </tr></table>`,
        )
        .join("");
    })
    .join("");
  return `<div style="font-family:${look.font ?? FONT};font-size:${look.size ?? 15}px;font-weight:${look.weight ?? 400};line-height:${look.lineHeight ?? 1.55};color:${color}">${body}</div>`;
}

function chip(text: string, background = C.sun): string {
  return `<span style="display:inline-block;margin:6px 6px 0 0;padding:3px 9px;border-radius:10px;background:${background};font-family:${FONT};font-size:12px;font-weight:700;color:${C.ink}">${escapeHtml(text)}</span>`;
}

function taskRow(task: SessionTask, marker: string): string {
  return `<tr>
    <td valign="top" style="width:34px;padding:12px 0;border-top:1px solid #ececf0">${marker}</td>
    <td style="padding:12px 0;border-top:1px solid #ececf0;font-family:${FONT};font-size:15px;line-height:1.45;font-weight:600;color:${C.ink}">
      ${inlineHtml(parseInline(task.task))}
      ${task.due || task.whoKind === "both" ? `<div>${task.due ? chip(task.due) : ""}${task.whoKind === "both" ? chip("Spolu s Honzou", C.turquoise100) : ""}</div>` : ""}
      ${task.note ? `<div style="margin-top:6px;font-size:14px;font-weight:400;color:${C.ink2}">${escapeHtml(task.note)}</div>` : ""}
    </td>
  </tr>`;
}

function tasksHtml(tasksBody: string, recommendations: string): string {
  const tasks = parseTasks(tasksBody);
  const mine = tasks.filter((task) => task.whoKind !== "coach");
  const coach = tasks.filter((task) => task.whoKind === "coach");
  const tips = recommendations
    .split("\n")
    .map((line) => line.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  if (tasks.length === 0 && tips.length === 0) return "";

  const parts: string[] = [];
  if (mine.length > 0) {
    parts.push(`<h2 style="margin:0 0 8px;font-family:${DISPLAY};font-size:18px;font-weight:800;color:${C.ink}">Úkoly do příště</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${mine
      .map((task, index) =>
        taskRow(
          task,
          `<div style="width:24px;height:24px;border-radius:12px;background:${C.ink};color:${C.sun};text-align:center;font-family:${FONT};font-size:12px;font-weight:800;line-height:24px">${index + 1}</div>`,
        ),
      )
      .join("")}</table>`);
  }
  if (coach.length > 0) {
    parts.push(`<div style="margin-top:${parts.length ? "18px" : "0"}">${eyebrow("Co pro tebe udělá Honza", C.muted)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px">${coach
      .map((task) =>
        taskRow(task, `<div style="width:6px;height:6px;margin:8px 0 0 8px;border-radius:3px;background:${C.muted}"></div>`),
      )
      .join("")}</table>`);
  }
  if (tips.length > 0) {
    parts.push(`<div style="margin-top:${parts.length ? "18px" : "0"};padding:14px;border-radius:16px;background:${C.canvas}">
      ${eyebrow("Doporučení · nepovinné", C.muted)}
      <div style="margin-top:8px">${tips
        .map(
          (tip) =>
            `<p style="margin:0 0 8px;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.ink2}">💡 ${inlineHtml(parseInline(tip))}</p>`,
        )
        .join("")}</div>
    </div>`);
  }
  return parts.join("");
}

function feedbackCard(feedbackUrl: (rating?: number) => string): string {
  const cell = (n: number) =>
    `<td style="padding:3px"><a href="${escapeHtml(feedbackUrl(n))}" style="display:block;height:40px;line-height:40px;border-radius:12px;background:#2c2c2e;color:#ffffff;text-align:center;text-decoration:none;font-family:${DISPLAY};font-size:15px;font-weight:800">${n}</a></td>`;
  const row = (from: number) =>
    `<tr>${[0, 1, 2, 3, 4].map((i) => cell(from + i)).join("")}</tr>`;

  return card(
    C.night,
    `${eyebrow("Tvoje zpětná vazba", C.sun)}
    <p style="margin:8px 0 0;font-family:${DISPLAY};font-size:22px;line-height:1.25;font-weight:800;color:#ffffff">Jak ti dnešní sezení sedlo?</p>
    <p style="margin:8px 0 12px;font-family:${FONT};font-size:14px;line-height:1.5;color:#aeaeb2">Klikni na číslo – otevře se aplikace s vybraným hodnocením a dopíšeš, co sis odnesl.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed">${row(1)}${row(6)}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px"><tr>
      <td style="font-family:${FONT};font-size:12px;color:#8e8e93">nic moc</td>
      <td style="font-family:${FONT};font-size:12px;color:#8e8e93;text-align:right">pecka</td>
    </tr></table>
    <a href="${escapeHtml(feedbackUrl())}" style="display:block;margin-top:14px;height:50px;line-height:50px;border-radius:25px;background:${C.sun};color:${C.ink};text-align:center;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:800">Napsat zpětnou vazbu →</a>`,
  );
}

function textVersion(
  heading: { title: string; subtitle: string },
  sections: Array<{ key: string; title: string; body: string }>,
  sessionUrl: string,
  feedbackUrl: string,
): string {
  const lines = [
    `Zápis ze sezení · ${heading.title}`,
    heading.subtitle,
    "",
    "Ahoj, díky za dnešek. Tady máš všechno, na čem jsme se domluvili.",
    "",
  ];
  for (const section of sections) {
    lines.push(section.title.toUpperCase(), section.body.replace(/\*\*/g, ""), "");
  }
  lines.push(
    "Jak ti dnešní sezení sedlo? Napiš mi zpětnou vazbu:",
    feedbackUrl,
    "",
    `Celý zápis v aplikaci: ${sessionUrl}`,
  );
  return lines.join("\n");
}
