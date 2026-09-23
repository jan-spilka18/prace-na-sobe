"use client";

import { useState, useTransition } from "react";
import { resetOnboarding } from "@/app/actions/onboarding";

/**
 * Pošle klienta průvodcem znovu. Hodí se i Honzovi: založí si zkušebního
 * klienta a průvodce si projde sám, kolikrát chce.
 */
export function ResetOnboarding({ clientId }: { clientId: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function reset() {
    setError(undefined);
    startTransition(async () => {
      const result = await resetOnboarding(clientId);
      if (result.error) return setError(result.error);
      setDone(true);
    });
  }

  if (done) {
    return (
      <p className="px-4 py-3 text-[15px] text-turquoise-700">
        Při příštím otevření aplikace ho průvodce přivítá znovu.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="flex min-h-[48px] w-full items-center px-4 py-3 text-left text-[17px] text-turquoise-700 active:bg-canvas disabled:opacity-50"
      >
        {pending ? "Chvilku…" : "Ukázat průvodce znovu"}
      </button>
      {error && (
        <p role="alert" className="px-4 pb-3 text-[14px] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
