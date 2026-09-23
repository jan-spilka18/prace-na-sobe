"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Toggle } from "@/components/ui/Field";
import {
  pushState,
  subscribeInBrowser,
  unsubscribeInBrowser,
  type PushState,
} from "@/lib/pushClient";
import {
  sendTestPush,
  subscribePush,
  unsubscribePush,
} from "@/app/actions/push";

/**
 * Zapnutí notifikací na tomhle zařízení.
 *
 * Odběr je vázaný na zařízení, ne na účet — proto se tu mluví o „tomhle
 * telefonu". Kdo appku používá na telefonu i na notebooku, musí si je
 * zapnout dvakrát, a je lepší to říct rovnou než nechat druhé zařízení
 * tiše mlčet.
 */
export function NotificationSettings({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    pushState(publicKey !== "").then(setState);
  }, [publicKey]);

  function enable() {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const outcome = await subscribeInBrowser(publicKey);

      if (outcome.kind === "denied") {
        setState("denied");
        return;
      }
      if (outcome.kind === "error") {
        setError(outcome.message);
        return;
      }

      const saved = await subscribePush({
        endpoint: outcome.endpoint,
        p256dh: outcome.p256dh,
        auth: outcome.auth,
        userAgent: navigator.userAgent,
      });

      if (saved.error) return setError(saved.error);
      setState("on");
      setMessage("Zapnuto. Zkus si poslat zkušební notifikaci.");
    });
  }

  function disable() {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const endpoint = await unsubscribeInBrowser();
      if (endpoint) await unsubscribePush(endpoint);
      setState("ready");
    });
  }

  function test() {
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await sendTestPush();
      if (result.error) return setError(result.error);
      setMessage("Odesláno. Za chvíli by měla dorazit.");
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
        Připomínky
      </h2>

      <div className="overflow-hidden rounded-group bg-surface">
        <div className="flex min-h-[48px] items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] text-ink">Notifikace na tomhle telefonu</p>
            <p className="mt-0.5 text-[14px] leading-snug text-ink-600">
              {describe(state)}
            </p>
          </div>

          {(state === "ready" || state === "on") && (
            <Toggle
              checked={state === "on"}
              disabled={pending}
              label="Notifikace na tomhle telefonu"
              onChange={(next) => (next ? enable() : disable())}
            />
          )}
        </div>

        {state === "on" && (
          <button
            type="button"
            onClick={test}
            disabled={pending}
            className="flex min-h-[48px] w-full items-center border-t border-hairline px-4 py-3 text-left text-[17px] text-turquoise-700 active:bg-canvas"
          >
            {pending ? "Odesílám…" : "Poslat zkušební notifikaci"}
          </button>
        )}

        {state === "needs-install" && (
          <Link
            href="/nastaveni/instalace"
            className="flex min-h-[48px] w-full items-center border-t border-hairline px-4 py-3 text-[17px] text-turquoise-700 active:bg-canvas"
          >
            Jak si appku dát na plochu
          </Link>
        )}
      </div>

      {message && (
        <p className="px-4 text-[13px] text-turquoise-700">{message}</p>
      )}
      {error && (
        <p role="alert" className="px-4 text-[13px] text-danger">
          {error}
        </p>
      )}
    </section>
  );
}

function describe(state: PushState | null): string {
  switch (state) {
    case null:
      return "Zjišťuju…";
    case "on":
      return "Zapnuté. Připomínka přijde v čas, který si nastavíš u návyku.";
    case "ready":
      return "Vypnuté. Po zapnutí se telefon jednou zeptá na svolení.";
    case "denied":
      return "Notifikace jsi pro tuhle appku zakázal/a. Povolit se dají zpátky jen v nastavení telefonu.";
    case "needs-install":
      return "iPhone pouští notifikace jen aplikacím spuštěným z plochy. Přidej si ji tam a otevři ji odtamtud.";
    case "unsupported":
      return "Tenhle prohlížeč notifikace neumí.";
    case "not-configured":
      return "Notifikace zatím nejsou na serveru nastavené.";
  }
}
