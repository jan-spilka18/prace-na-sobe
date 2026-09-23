/*
  Odesílání e-mailu přes Resend.

  Voláno přes fetch, ne přes knihovnu: je to jeden POST a závislost navíc
  by přinesla jen další věc, kterou je potřeba udržovat. Vyměnit Resend za
  něco jiného znamená přepsat tenhle jeden soubor.
*/

export type EmailResult = { ok: boolean; error?: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<EmailResult> {
  if (!emailConfigured()) {
    return { ok: false, error: "E-mail není nastavený." };
  }

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
