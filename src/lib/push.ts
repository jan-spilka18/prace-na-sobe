import webpush from "web-push";
import type { PushSubscriptionRow } from "@/lib/database.types";

/*
  Odesílání web push.

  Klíče VAPID žijí jen v proměnných prostředí na Vercelu. Veřejný se dostane
  i do prohlížeče (má prefix NEXT_PUBLIC_), soukromý nikdy — kdo ho má, může
  posílat notifikace jménem téhle aplikace.
*/

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function publicVapidKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

/**
 * Push je nastavený a dá se posílat.
 *
 * Bez klíčů se nic neodešle a aplikace kvůli tomu nespadne — notifikace
 * jsou doplněk, ne podmínka, aby si klient odškrtl návyk.
 */
export function pushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type SendResult = { ok: boolean; gone: boolean; error?: string };

/**
 * Pošle notifikaci na jeden odběr.
 *
 * `gone` znamená, že odběr už neplatí — člověk aplikaci odinstaloval nebo
 * notifikace vypnul v systému. Takový záznam se má smazat, ne zkoušet znovu:
 * jinak by se fronta donekonečna pokoušela doručit na mrtvou adresu.
 */
export async function sendPush(
  subscription: Pick<PushSubscriptionRow, "endpoint" | "p256dh" | "auth">,
  payload: PushPayload,
): Promise<SendResult> {
  if (!pushConfigured()) {
    return { ok: false, gone: false, error: "Push není nastavený." };
  }

  configure();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 12 },
    );
    return { ok: true, gone: false };
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    return {
      ok: false,
      gone: status === 404 || status === 410,
      error: (error as Error).message,
    };
  }
}
