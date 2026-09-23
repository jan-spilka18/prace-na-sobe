/**
 * Prohlížečová část push notifikací.
 *
 * Všechno tu vrací popsaný stav místo výjimky. Důvodů, proč notifikace
 * nejdou zapnout, je totiž víc než jeden a každý potřebuje jinou radu —
 * „nepodařilo se" by klienta nechalo stát na místě.
 */

export type PushState =
  | "ready" // dá se zapnout
  | "on" // už běží
  | "denied" // člověk je odmítl v systému
  | "needs-install" // iOS: nejdřív na plochu
  | "unsupported" // prohlížeč to neumí
  | "not-configured"; // chybí klíče na serveru

/** Aplikace běží spuštěná z plochy, ne jako záložka v prohlížeči. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari nemá display-mode, hlásí to vlastním příznakem.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad se od iPadOS 13 hlásí jako Mac. Dotyk ho prozradí.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export async function pushState(hasKey: boolean): Promise<PushState> {
  if (!hasKey) return "not-configured";

  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  ) {
    /*
      Na iPhonu tohle neznamená starý systém, ale aplikaci otevřenou
      v Safari místo z plochy: iOS zpřístupní Push API jenom aplikacím
      spuštěným v režimu standalone.
    */
    return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  }

  if (isIOS() && !isStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration();
  const existing = await registration?.pushManager.getSubscription();

  return existing ? "on" : "ready";
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export type SubscribeOutcome =
  | { kind: "ok"; endpoint: string; p256dh: string; auth: string }
  | { kind: "denied" }
  | { kind: "error"; message: string };

export async function subscribeInBrowser(
  publicKey: string,
): Promise<SubscribeOutcome> {
  try {
    const registration =
      (await navigator.serviceWorker.getRegistration()) ??
      (await registerServiceWorker());

    if (!registration) {
      return { kind: "error", message: "Service worker se nepodařilo spustit." };
    }

    // Musí přijít z gesta uživatele, jinak to Safari odmítne bez zeptání.
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { kind: "denied" };

    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      // Bez userVisibleOnly prohlížeče odběr odmítnou. Znamená to slib,
      // že každá notifikace bude vidět — žádné tiché sledování.
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const json = subscription.toJSON();
    if (!json.keys?.p256dh || !json.keys?.auth || !json.endpoint) {
      return { kind: "error", message: "Prohlížeč vrátil neúplný odběr." };
    }

    return {
      kind: "ok",
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    };
  } catch (error) {
    return { kind: "error", message: (error as Error).message };
  }
}

export async function unsubscribeInBrowser(): Promise<string | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return null;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  return endpoint;
}

/**
 * VAPID klíč se předává jako bajty, ne jako text.
 *
 * Je uložený v base64url (bez výplně, s - a _ místo + a /), takže se musí
 * převést zpátky na klasický base64, než ho atob rozbalí.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");

  const raw = atob(normalized);
  // Pole se staví nad vlastním ArrayBufferem: applicationServerKey přijímá
  // BufferSource, a Uint8Array nad sdíleným bufferem tam neprojde.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);

  return output;
}
