"use client";

import { useState, useTransition } from "react";
import { sendAccessEmail } from "@/app/admin/actions";

/**
 * Tlačítko „Poslat přístupy e-mailem": odkaz na aplikaci, e-mail a heslo.
 *
 * Ukazuje se tam, kde Honza heslo právě vidí — po založení klienta a po
 * nastavení nového hesla. Jinde to nejde, heslo se nikam neukládá.
 */
export function SendAccessEmail({
  email,
  password,
  ready,
}: {
  email: string;
  password: string;
  /** Je aplikace propojená s Gmailem? */
  ready: boolean;
}) {
  const [result, setResult] = useState<{ error?: string; sentTo?: string }>();
  const [pending, startTransition] = useTransition();

  if (!ready) {
    return (
      <p className="rounded-[16px] bg-canvas px-4 py-3 text-[13px] leading-snug text-ink-600">
        Poslat přístupy e-mailem zatím nejde — aplikace není propojená
        s Gmailem. Údaje zkopíruj a pošli ručně.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setResult(await sendAccessEmail({ email, password }));
          })
        }
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-night px-5 text-[16px] font-extrabold text-white transition-opacity active:opacity-80 disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
          <path d="M3.5 7.5l8.5 6 8.5-6" />
        </svg>
        {pending
          ? "Posílám…"
          : result?.sentTo
            ? "Poslat znovu"
            : "Poslat přístupy e-mailem"}
      </button>

      {result?.sentTo && (
        <p role="status" className="rounded-[16px] bg-turquoise-100 px-4 py-3 text-[14px] font-semibold leading-snug text-turquoise-700">
          Odesláno na {result.sentTo}: odkaz na aplikaci, e-mail a heslo.
        </p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-[16px] bg-sun-surface px-4 py-3 text-[14px] font-semibold leading-snug text-ink">
          {result.error}
        </p>
      )}
      {!result && (
        <p className="px-1 text-center text-[13px] leading-snug text-ink-500">
          Na {email} přijde odkaz na aplikaci, e-mail a heslo.
        </p>
      )}
    </div>
  );
}
