"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, TextInput } from "@/components/ui/Field";
import { createSession } from "@/app/actions/sessions";
import { SESSION_KIND_LABELS } from "@/lib/sessionTemplate";
import type { SessionKind } from "@/lib/database.types";

export function NewSessionForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sessionDate, setSessionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
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
      <Button full onClick={() => setOpen(true)}>
        Nové sezení
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-group bg-surface p-4">
      <Field label="Datum">
        <TextInput
          type="date"
          value={sessionDate}
          onChange={(event) => setSessionDate(event.target.value)}
        />
      </Field>

      <Field label="Typ">
        <Select
          value={kind}
          onChange={(event) => setKind(event.target.value as SessionKind)}
        >
          {Object.entries(SESSION_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <FormError>{error}</FormError>

      <div className="flex gap-3">
        <Button variant="quiet" className="flex-1" onClick={() => setOpen(false)}>
          Zrušit
        </Button>
        <Button className="flex-1" disabled={pending} onClick={submit}>
          {pending ? "Zakládám…" : "Založit"}
        </Button>
      </div>
    </div>
  );
}
