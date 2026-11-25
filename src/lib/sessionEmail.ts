import { escapeHtml } from "@/lib/email";
import { parseInline, parseMarkdown, plainText, type InlineToken } from "@/lib/markdown";
import { filledSections, sessionHeading } from "@/lib/sessionTemplate";
import { parseTasks, refineTasks, type SessionTask } from "@/lib/sessionTasks";
import { parseLinks } from "@/lib/sessionLinks";
import { formatShortDate } from "@/lib/date";
import type { SessionKind } from "@/lib/database.types";

/*
  E-mail se zápisem ze sezení.

  Vypadá jako zápis v aplikaci: černá hlavička, tyrkysový fokus, žlutá
  otázka, úkoly s termíny. Dole jsou čísla 1–10 — klik na číslo otevře
  aplikaci s vybraným hodnocením, takže zpětná vazba je na jeden dotek.

  E-mailové aplikace (hlavně Gmail a Outlook) neumí moderní CSS. Proto
  tabulky a styly přímo na prvcích.

  Žádné tmavé karty se světlým písmem: Gmail v tmavém režimu (hlavně na
  iPhonu) barvy sám převrací a z bílého písma na černé kartě udělal tmavé
  písmo na tmavém pozadí. Všude je proto tmavé písmo na světlém nebo
  barevném podkladu — to Gmail převrátí čitelně, ať je režim jakýkoli. Soukromá poznámka pro Honzu tu být
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
};

const FONT = "Outfit,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

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

/*
  Texty schválně nezávisí na dni odeslání. Zápis odchází někdy hned,
  jindy až za pár dní — „díky za dnešek" by pak nesedělo. Kdy sezení
  bylo, říká datum v hlavičce (pole Datum u sezení).
*/

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
      C.surface,
      `${brand(input.appUrl)}
      ${eyebrow(`Zápis ze sezení · ${heading.title}`, C.turquoise700)}
      <h1 style="margin:6px 0 0;font-family:${DISPLAY};font-size:28px;line-height:1.15;font-weight:700;color:${C.ink}">${escapeHtml(heading.subtitle || "Sezení")}</h1>
      <p style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.ink2}">Ahoj, díky za společné sezení. Tady máš všechno, na čem jsme se domluvili, ať to máš po ruce.</p>`,
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

    if (section.key === "links") {
      const html = linksHtml(section.title, section.body);
      if (html) blocks.push(card(C.surface, html));
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
        `<h2 style="margin:0 0 10px;font-family:${DISPLAY};font-size:18px;font-weight:700;color:${C.ink}">${escapeHtml(section.title)}</h2>
        ${markdownHtml(section.body, C.ink2)}`,
      ),
    );
  }

  blocks.push(feedbackCard(feedbackUrl));

  blocks.push(`<tr><td style="padding:8px 12px 0;text-align:center">
    <a href="${escapeHtml(sessionUrl)}" style="font-family:${FONT};font-size:15px;font-weight:700;color:${C.turquoise700};text-decoration:none">Otevřít zápis v aplikaci</a>
    <p style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">Tenhle e-mail ti přišel, protože ti Honza zveřejnil zápis ze sezení v aplikaci Higher Self.</p>
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
  return `<div style="font-family:${DISPLAY};font-size:13px;font-weight:700;color:${color}">${escapeHtml(text)}</div>`;
}

/**
 * Hlavička e-mailu: miniatura „hs." a název aplikace. Miniatura má vlastní
 * tmavou dlaždici, takže je čitelná i v tmavém režimu Gmailu — tmavý
 * wordmark by tam zmizel.
 */
function brand(appUrl: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px"><tr>
    <td style="width:30px"><img src="${escapeHtml(appUrl)}/brand/ikona-tmava-96.png" width="30" height="30" alt="hs." style="display:block;border:0;border-radius:8px"></td>
    <td style="padding-left:9px;font-family:${DISPLAY};font-size:15px;font-weight:700;letter-spacing:-0.3px;color:${C.ink}">Higher Self</td>
  </tr></table>`;
}

function inlineHtml(tokens: InlineToken[]): string {
  return tokens
    .map((token) =>
      token.kind === "link"
        ? `<a href="${escapeHtml(token.href)}" style="color:${C.turquoise700};font-weight:700;text-decoration:underline">${escapeHtml(token.text)}</a>`
        : token.kind === "strong"
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
            <td valign="top" style="width:20px;padding-top:${block.kind === "bullets" ? "8px" : "0"};font-family:${FONT};font-size:14px;font-weight:700;color:${C.turquoise700}">${
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
      ${task.note ? `<div style="margin-top:6px;font-size:14px;font-weight:400;color:${C.ink2}">${inlineHtml(parseInline(task.note))}</div>` : ""}
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
    parts.push(`<h2 style="margin:0 0 8px;font-family:${DISPLAY};font-size:18px;font-weight:700;color:${C.ink}">Úkoly do příště</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${mine
      .map((task, index) =>
        taskRow(
          task,
          `<div style="width:24px;height:24px;border-radius:12px;background:${C.turquoise};color:${C.ink};text-align:center;font-family:${FONT};font-size:12px;font-weight:700;line-height:24px">${index + 1}</div>`,
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

/** Odkazy jako velká tlačítka — v e-mailu se na ně kliká prstem. */
function linksHtml(title: string, body: string): string {
  const links = parseLinks(body);
  if (links.length === 0) return "";

  const rows = links
    .map((link) =>
      link.url
        ? `<a href="${escapeHtml(link.url)}" style="display:block;margin-top:8px;padding:12px 14px;border-radius:16px;background:${C.canvas};text-decoration:none">
        <span style="display:block;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.35;color:${C.ink}">${link.kind === "video" ? "▶ " : ""}${escapeHtml(link.label)} ↗</span>
        <span style="display:block;margin-top:2px;font-family:${FONT};font-size:12px;color:${C.muted}">${escapeHtml(link.host)}</span>
      </a>`
        : `<p style="margin:8px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.ink2}">${escapeHtml(link.label)}</p>`,
    )
    .join("");

  return `<h2 style="margin:0 0 4px;font-family:${DISPLAY};font-size:18px;font-weight:700;color:${C.ink}">${escapeHtml(title)}</h2>${rows}`;
}

function feedbackCard(feedbackUrl: (rating?: number) => string): string {
  const cell = (n: number) =>
    `<td style="padding:3px"><a href="${escapeHtml(feedbackUrl(n))}" style="display:block;height:40px;line-height:40px;border-radius:12px;background:${C.surface};color:${C.ink};text-align:center;text-decoration:none;font-family:${DISPLAY};font-size:15px;font-weight:700">${n}</a></td>`;
  const row = (from: number) =>
    `<tr>${[0, 1, 2, 3, 4].map((i) => cell(from + i)).join("")}</tr>`;

  return card(
    C.turquoise100,
    `${eyebrow("Tvoje zpětná vazba", C.turquoise700)}
    <p style="margin:8px 0 0;font-family:${DISPLAY};font-size:22px;line-height:1.25;font-weight:700;color:${C.ink}">Jak ti naše sezení sedlo?</p>
    <p style="margin:8px 0 12px;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.ink2}">Klikni na číslo – otevře se aplikace s vybraným hodnocením a dopíšeš, co sis odnesl.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed">${row(1)}${row(6)}</table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px"><tr>
      <td style="font-family:${FONT};font-size:12px;color:${C.turquoise700}">nic moc</td>
      <td style="font-family:${FONT};font-size:12px;color:${C.turquoise700};text-align:right">pecka</td>
    </tr></table>
    <a href="${escapeHtml(feedbackUrl())}" style="display:block;margin-top:14px;height:50px;line-height:50px;border-radius:25px;background:${C.turquoise};color:${C.ink};text-align:center;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:700">Napsat zpětnou vazbu →</a>`,
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
    "Ahoj, díky za společné sezení. Tady máš všechno, na čem jsme se domluvili.",
    "",
  ];
  for (const section of sections) {
    lines.push(section.title.toUpperCase(), section.body.replace(/\*\*/g, ""), "");
  }
  lines.push(
    "Jak ti naše sezení sedlo? Napiš mi zpětnou vazbu:",
    feedbackUrl,
    "",
    `Celý zápis v aplikaci: ${sessionUrl}`,
  );
  return lines.join("\n");
}
