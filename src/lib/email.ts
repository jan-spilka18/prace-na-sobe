import nodemailer from "nodemailer";

export type EmailResult = { ok: boolean; error?: string };

/*
  Dvě cesty, jak e-mail odeslat:

  1. Gmail (GMAIL_USER + GMAIL_APP_PASSWORD) — e-maily chodí z Honzova
     Gmailu. Nic se nekupuje; heslo pro aplikace se vytvoří v nastavení
     Google účtu a leží jen ve Vercelu. Na deset klientů bohatě stačí.
  2. Resend (RESEND_API_KEY + EMAIL_FROM) — pro případ, že by jednou
     přibyla vlastní doména.

  Gmail má přednost, když je nastavený obojí.
*/

function gmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function emailConfigured(): boolean {
  return gmailConfigured() || resendConfigured();
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Jméno odesílatele, jak ho uvidí příjemce. */
  fromName?: string;
}): Promise<EmailResult> {
  if (gmailConfigured()) return sendViaGmail(input);
  if (resendConfigured()) return sendViaResend(input);
  return { ok: false, error: "E-mail není nastavený." };
}

async function sendViaGmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromName?: string;
}): Promise<EmailResult> {
  const user = process.env.GMAIL_USER!.trim();

  try {
    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user,
        // Google heslo pro aplikace zobrazuje s mezerami; SMTP je nechce.
        pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, ""),
      },
    });

    await transport.sendMail({
      from: { name: input.fromName ?? "Práce na sobě", address: user },
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { ok: true };
  } catch (error) {
    // Text chyby od Googlu nikdy neobsahuje heslo, jen kód a popis.
    return { ok: false, error: (error as Error).message.slice(0, 300) };
  }
}

async function sendViaResend(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        // Obojí: textová verze je pro čtečky a pro klienty, které HTML
        // nezobrazí, a zároveň snižuje šanci, že zpráva spadne do spamu.
        text: input.text,
        html: input.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `${response.status}: ${body.slice(0, 200)}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/** Text do HTML. Jména klientů chodí z databáze a do značek nepatří. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
