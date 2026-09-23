"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextArea } from "@/components/ui/Field";
import { saveFeedback } from "@/app/actions/sessions";
import type { SessionFeedback } from "@/lib/database.types";

/**
 * Zpětná vazba po sezení — dvě pole, nic víc.
 *
 * Volné poznámky tu schválně nejsou. Dvě konkrétní otázky vedou
 * k použitelné odpovědi líp než prázdné pole.
 */
export function FeedbackForm({
  sessionId,
  feedback,
}: {
  sessionId: string;
  feedback: SessionFeedback | null;
}) {
  const [feeling, setFeeling] = useState(feedback?.feeling ?? "");
  const [takeaway, setTakeaway] = useState(feedback?.takeaway ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const empty = feeling.trim() === "" && takeaway.trim() === "";

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveFeedback({ sessionId, feeling, takeaway });
      if (result.error) return setError(result.error);
      setSaved(true);
    });
  }

  return (
    <section className="space-y-4 rounded-group bg-surface p-4">
      <div>
        <h2 className="font-display text-[19px] font-semibold text-ink">
          Tvoje zpětná vazba
        </h2>
        <p className="mt-1 text-[14px] leading-snug text-ink-600">
          Uvidí ji jen Honza. Klidně stručně.
        </p>
      </div>

      <Field label="Jak se po sezení cítím">
        <TextArea
          value={feeling}
          rows={3}
          onChange={(event) => {
            setFeeling(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <Field label="Co jsem si odnesl/a">
        <TextArea
          value={takeaway}
          rows={3}
          onChange={(event) => {
            setTakeaway(event.target.value);
            setSaved(false);
          }}
        />
      </Field>

      <FormError>{error}</FormError>

      <div className="flex items-center gap-3">
        <Button
          className="flex-1"
          disabled={pending || empty}
          onClick={submit}
        >
          {pending ? "Ukládám…" : feedback ? "Uložit změny" : "Odeslat"}
        </Button>
        {saved && (
          <span className="text-[15px] text-turquoise-700">Uloženo</span>
        )}
      </div>
    </section>
  );
}
