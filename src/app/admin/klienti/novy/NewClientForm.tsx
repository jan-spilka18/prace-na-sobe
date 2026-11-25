"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { DEFAULT_PROGRAM_DURATION_DAYS } from "@/lib/config";
import { createClientAccount, type CreateClientState } from "@/app/admin/actions";
import { CopyableSecret } from "@/components/CopyableSecret";
import { SendAccessEmail } from "@/components/admin/SendAccessEmail";

export function NewClientForm({
  today,
  emailReady,
}: {
  today: string;
  /** Je aplikace propojená s Gmailem? Bez toho přístupy poslat nejdou. */
  emailReady: boolean;
}) {
  const [state, formAction] = useActionState<CreateClientState, FormData>(
    createClientAccount,
    {},
  );

  if (state.created) {
    return (
      <div className="space-y-5">
        <div className="rounded-[24px] bg-turquoise-100 px-5 py-5">
          <p className="font-display text-[20px] font-extrabold leading-snug tracking-tight text-ink">
            Účet pro {state.created.fullName} je připravený
          </p>
          <p className="mt-1.5 text-[15px] leading-snug text-ink-600">
            Pošli mu přístupy hned teď. Heslo se už nikde nezobrazí — kdyby
            se ztratilo, nastavíš nové v detailu klienta.
          </p>
        </div>

        <div className="space-y-3">
          <CopyableSecret label="E-mail" value={state.created.email} />
          <CopyableSecret label="Heslo" value={state.created.password} mono />
        </div>

        <SendAccessEmail
          email={state.created.email}
          password={state.created.password}
          ready={emailReady}
        />

        <Link
          href="/admin"
          className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-surface px-5 text-[15px] font-bold text-ink"
        >
          Hotovo
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
