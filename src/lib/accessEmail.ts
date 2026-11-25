import { escapeHtml } from "@/lib/email";

/*
  E-mail s přístupem do aplikace: odkaz, přihlašovací e-mail a heslo.

  Posílá ho Honza jedním tlačítkem po založení klienta nebo po nastavení
  nového hesla. Heslo se nikam neukládá — do e-mailu jde z obrazovky, na
  které ho Honza právě vidí.

  Stejně jako zápis ze sezení: jen světlé karty s tmavým písmem, aby
  zůstal čitelný i v tmavém režimu Gmailu.
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
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const DISPLAY = "Montserrat,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

export type AccessEmailInput = {
  email: string;
  password: string;
  /** Adresa aplikace bez lomítka na konci. */
  appUrl: string;
};

export function accessEmail(input: AccessEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = "Tvůj přístup do aplikace Práce na sobě";
  const url = escapeHtml(input.appUrl);

  const card = (background: string, inner: string) =>
    `<tr><td style="background:${background};border-radius:22px;padding:20px">${inner}</td></tr>`;
  const gap = `<tr><td style="height:12px;line-height:12px;font-size:0">&nbsp;</td></tr>`;
  const eyebrow = (text: string, color: string) =>
    `<div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:1.3px;text-transform:uppercase;color:${color}">${text}</div>`;
  const field = (label: string, value: string, font: string) =>
    `<div style="margin-top:10px;padding:12px 14px;border-radius:14px;background:${C.canvas}">
      <div style="font-family:${FONT};font-size:12px;font-weight:700;color:${C.muted}">${label}</div>
      <div style="margin-top:3px;font-family:${font};font-size:17px;font-weight:700;color:${C.ink};word-break:break-all">${escapeHtml(value)}</div>
    </div>`;

  const blocks = [
    card(
      C.surface,
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px"><tr>
        <td style="width:26px;height:26px;background:${C.turquoise};border-radius:8px;text-align:center;font-size:15px;line-height:26px">☀︎</td>
        <td style="padding-left:8px;font-family:${DISPLAY};font-size:14px;font-weight:800;color:${C.ink}">Práce na sobě</td>
      </tr></table>
      ${eyebrow("Tvoje výzva začíná", C.turquoise700)}
      <h1 style="margin:6px 0 0;font-family:${DISPLAY};font-size:28px;line-height:1.15;font-weight:800;color:${C.ink}">Vítej v aplikaci</h1>
      <p style="margin:14px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.ink2}">Ahoj, posílám ti přístup do aplikace. Budeš si v ní každý den odškrtávat návyky, uvidíš, jak ti výzva jde, a najdeš tam zápisy z našich sezení.</p>`,
    ),
    card(
      C.surface,
      `<h2 style="margin:0;font-family:${DISPLAY};font-size:18px;font-weight:800;color:${C.ink}">Tvoje přihlašovací údaje</h2>
      ${field("E-mail", input.email, FONT)}
      ${field("Heslo", input.password, MONO)}
      <a href="${url}" style="display:block;margin-top:16px;height:50px;line-height:50px;border-radius:25px;background:${C.turquoise};color:${C.ink};text-align:center;text-decoration:none;font-family:${FONT};font-size:16px;font-weight:800">Otevřít aplikaci →</a>
      <p style="margin:10px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.muted};text-align:center">${url.replace(/^https?:\/\//, "")}</p>`,
    ),
    card(
      C.turquoise100,
      `${eyebrow("Tip · ať ji máš po ruce", C.turquoise700)}
      <p style="margin:8px 0 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${C.ink}">Přidej si aplikaci na plochu telefonu, bude se chovat jako běžná appka.</p>
      <p style="margin:8px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.ink2}"><strong>iPhone:</strong> otevři odkaz v Safari, klepni na Sdílet a vyber „Přidat na plochu“.<br><strong>Android:</strong> otevři odkaz v Chromu, klepni na tři tečky a vyber „Přidat na plochu“.</p>`,
    ),
    `<tr><td style="padding:8px 12px 0;text-align:center">
      <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">Heslo si nech pro sebe. Kdybys ho ztratil nebo se nemohl přihlásit, napiš Honzovi.</p>
    </td></tr>`,
  ];

  const html = `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${C.canvas}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas}">
<tr><td align="center" style="padding:16px 10px 32px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
${blocks.join(`\n${gap}\n`)}
</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    "Ahoj, posílám ti přístup do aplikace Práce na sobě.",
    "",
    `Aplikace: ${input.appUrl}`,
    `E-mail: ${input.email}`,
    `Heslo: ${input.password}`,
    "",
    "Tip: přidej si aplikaci na plochu telefonu.",
    "iPhone: otevři odkaz v Safari, klepni na Sdílet a vyber „Přidat na plochu“.",
    "Android: otevři odkaz v Chromu, klepni na tři tečky a vyber „Přidat na plochu“.",
    "",
    "Heslo si nech pro sebe. Kdybys ho ztratil, napiš Honzovi.",
  ].join("\n");

  return { subject, html, text };
}
