"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PushResult = { error?: string; ok?: boolean };

/**
 * Uloží odběr push notifikací.
 *
 * Endpoint je v databázi unikátní, takže jedno zařízení nevytvoří dva
 * záznamy ani po přeinstalování — prohlížeč pro stejné zařízení vrátí
 * stejnou adresu.
 */
export async function subscribePush(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<PushResult> {
  const profile = await requireProfile();

  if (!input.endpoint || !input.p256dh || !input.auth) {
    return { error: "Odběr přišel neúplný." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: profile.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent?.slice(0, 500) ?? null,
      last_used_at: new Date().toISOString(),
      // Po novém přihlášení k odběru se počítadlo chyb vynuluje —
      // jinak by si zařízení neslo minulé selhání napořád.
      failed_at: null,
      fail_count: 0,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { error: error.message };
  return { ok: true };
}

export async function unsubscribePush(endpoint: string): Promise<PushResult> {
  await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) return { error: error.message };
  return { ok: true };
}

/** Zkušební notifikace — ověří celou cestu od serveru po zamčený displej. */
export async function sendTestPush(): Promise<PushResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", profile.id);

  if (!subscriptions || subscriptions.length === 0) {
    return { error: "Tohle zařízení zatím notifikace neodebírá." };
  }

  // Import až tady: web-push je serverová knihovna a v klientském
  // bundlu nemá co dělat.
  const { sendPush, pushConfigured } = await import("@/lib/push");

  if (!pushConfigured()) {
    return { error: "Na serveru chybí klíče VAPID. Doplň je ve Vercelu." };
  }

  let delivered = 0;
  for (const subscription of subscriptions) {
    const result = await sendPush(subscription, {
      title: "Zkouška",
      body: "Notifikace fungují. Tohle je jediná, kterou jsi si vyžádal/a.",
      url: "/nastaveni",
      tag: "test",
    });

    if (result.ok) delivered++;
    if (result.gone) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);
    }
  }

  if (delivered === 0) {
    return { error: "Nepodařilo se doručit. Zkus notifikace vypnout a zapnout." };
  }

  return { ok: true };
}

export type NotificationPrefs = {
  pushEnabled: boolean;
  emailEnabled: boolean;
};

export async function saveNotificationPrefs(
  prefs: NotificationPrefs,
): Promise<PushResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase.from("notification_settings").upsert(
    {
      user_id: profile.id,
      push_enabled: prefs.pushEnabled,
      email_enabled: prefs.emailEnabled,
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };
  return { ok: true };
}
