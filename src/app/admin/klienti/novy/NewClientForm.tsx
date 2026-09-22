"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { Card } from "@/components/ui/List";
import { DEFAULT_PROGRAM_DURATION_DAYS } from "@/lib/config";
import { createClientAccount, type CreateClientState } from "@/app/admin/actions";
import { CopyableSecret } from "@/components/CopyableSecret";

export function NewClientForm({ today }: { today: string }) {
  const [state, formAction] = useActionState<CreateClientState, FormData>(
    createClientAccount,
    {},
  );

  if (state.created) {
    return (
      <div className="space-y-5">
        <Card className="border border-turquoise-200 bg-turquoise-50">
          <p className="text-[17px] font-semibold text-ink">
            Účet pro {state.created.fullName} je připravený
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-600">
            Předej klientovi tyhle přístupy. Heslo se už nikde nezobrazí —
            kdyby se ztratilo, vygeneruješ nové v detailu klienta.
          </p>
        </Card>

        <div className="space-y-3">
          <CopyableSecret label="E-mail" value={state.created.email} />
          <CopyableSecret label="Heslo" value={state.created.password} mono />
        </div>

        <Link href="/admin" className="block">
          <Button full variant="secondary">
            Hotovo
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Jméno a příjmení">
        <TextInput name="full_name" required autoComplete="off" />
      </Field>

      <Field
        label="E-mail"
        hint="Tímhle se bude klient přihlašovat."
      >
        <TextInput
          name="email"
          type="email"
          required
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="email"
        />
      </Field>

      <Field label="Začátek programu">
        <TextInput name="start_date" type="date" required defaultValue={today} />
      </Field>

      <Field label="Délka programu ve dnech">
        <TextInput
          name="duration_days"
          type="number"
          min={1}
          max={3650}
          required
          defaultValue={DEFAULT_PROGRAM_DURATION_DAYS}
        />
      </Field>

      <FormError>{state.error}</FormError>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending} className="mt-2">
      {pending ? "Zakládám…" : "Založit klienta"}
    </Button>
  );
}
