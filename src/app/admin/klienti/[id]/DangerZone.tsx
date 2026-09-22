"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { CopyableSecret } from "@/components/CopyableSecret";
import {
  deleteClientAccount,
  resetClientPassword,
  type DeleteClientState,
  type ResetPasswordState,
} from "@/app/admin/actions";

export function DangerZone({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  return (
    <div className="space-y-6">
      <ResetPassword clientId={clientId} />
      <DeleteClient clientId={clientId} clientName={clientName} />
    </div>
  );
}

function ResetPassword({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<ResetPasswordState, FormData>(
    resetClientPassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
        Heslo
      </h2>

      <div className="space-y-3 rounded-group bg-surface p-4">
        <input type="hidden" name="client_id" value={clientId} />

        {state.password ? (
          <>
            <CopyableSecret label="Nové heslo" value={state.password} mono />
            <p className="px-1 text-[13px] leading-snug text-ink-500">
              Staré heslo přestalo platit. Předej klientovi tohle.
            </p>
          </>
        ) : (
          <p className="px-1 text-[15px] leading-relaxed text-ink-600">
            Vygeneruje nové heslo a to staré zneplatní.
          </p>
        )}

        <FormError>{state.error}</FormError>
        <ResetButton hasPassword={Boolean(state.password)} />
      </div>
    </form>
  );
}

function ResetButton({ hasPassword }: { hasPassword: boolean }) {
  return (
    <Button type="submit" variant="quiet" full>
      {hasPassword ? "Vygenerovat znovu" : "Vygenerovat nové heslo"}
    </Button>
  );
}

function DeleteClient({
  clientId,
  clientName,
}: {
  clientId: string;
  clientName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<DeleteClientState, FormData>(
    async (prev, formData) => {
      const result = await deleteClientAccount(prev, formData);
      if (!result.error) router.push("/admin");
      return result;
    },
    {},
  );

  if (!open) {
    return (
      <div className="space-y-3">
        <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
          Smazání klienta
        </h2>
        <div className="space-y-3 rounded-group bg-surface p-4">
          <p className="px-1 text-[15px] leading-relaxed text-ink-600">
            Smaže účet i všechna data — návyky, vyplněné dny, zápisy ze sezení,
            zpětnou vazbu i tvoje soukromé poznámky. Nejde to vrátit.
          </p>
          <Button variant="danger" full onClick={() => setOpen(true)}>
            Smazat klienta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
        Smazání klienta
      </h2>

      <div className="space-y-4 rounded-group bg-surface p-4">
        <input type="hidden" name="client_id" value={clientId} />

        <p className="px-1 text-[15px] leading-relaxed text-ink-600">
          Opravdu smazat klienta <strong className="text-ink">{clientName}</strong>{" "}
          a všechna jeho data?
        </p>

        <Field label="Napiš SMAZAT pro potvrzení">
          <TextInput
            name="confirmation"
            required
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="SMAZAT"
          />
        </Field>

        <FormError>{state.error}</FormError>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="quiet"
            className="flex-1"
            onClick={() => setOpen(false)}
          >
            Zpět
          </Button>
          <DeleteButton />
        </div>
      </div>
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" className="flex-1" disabled={pending}>
      {pending ? "Mažu…" : "Smazat"}
    </Button>
  );
}
