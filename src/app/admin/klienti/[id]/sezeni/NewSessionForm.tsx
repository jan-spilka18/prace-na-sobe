"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { createSession } from "@/app/actions/sessions";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import { todayISO } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { SessionKind } from "@/lib/database.types";

export function NewSessionForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(() => todayISO());
  const [kind, setKind] = useState<SessionKind>("coaching");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await createSession({ clientId, sessionDate, kind });
      if (result.error) return setError(result.error);

      // Rovnou do zápisu — kvůli němu se sezení zakládá.
      router.push(`/admin/klienti/${clientId}/sezeni/${result.sessionId}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-night px-5 text-[16px] font-extrabold text-white transition-opacity active:opacity-80"
      >
        <span aria-hidden className="text-[20px] leading-none">+</span>
        Nové sezení
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-[24px] bg-surface p-5">
      <h2 className="font-display text-[20px] font-extrabold tracking-tight text-ink">
        Nové sezení
      </h2>

      <Field label="Kdy bylo">
        <TextInput
          type="date"
          value={sessionDate}
          onChange={(event) => setSessionDate(event.target.value)}
        />
      </Field>

      {/*
        Štítky místo rozbalovacího seznamu: čtyři možnosti jsou vidět
        najednou a volba je jedno klepnutí.
      */}
      <fieldset>
        <legend className="mb-1.5 px-1 text-[13px] font-semibold text-ink-600">
          Typ sezení
        </legend>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(SESSION_KIND_LABELS) as [SessionKind, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  "min-h-[40px] rounded-full px-4 text-[14px] font-bold transition-colors",
                  kind === value
                    ? "bg-turquoise text-on-sun"
                    : "bg-canvas text-ink-600",
                )}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </fieldset>

      <FormError>{error}</FormError>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[48px] rounded-full bg-canvas px-5 text-[15px] font-bold text-ink"
        >
          Zrušit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="min-h-[48px] flex-1 rounded-full bg-night px-5 text-[15px] font-extrabold text-white transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Zakládám…" : "Založit a psát zápis"}
        </button>
      </div>
    </div>
  );
}
