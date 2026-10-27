"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { CopyableSecret } from "@/components/CopyableSecret";
import { MIN_PASSWORD_LENGTH } from "@/lib/config";
import {
  setClientPassword,
  updateClientContact,
  type ContactState,
  type PasswordState,
} from "@/app/admin/actions";

const HEADING =
  "px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500";

export function ContactForm({
  clientId,
  email: initialEmail,
  phone: initialPhone,
}: {
  clientId: string;
  email: string;
  phone: string;
}) {
  const [state, formAction] = useActionState<ContactState, FormData>(
    updateClientContact,
    {},
  );
  // Řízená pole: po neúspěšném uložení musí zůstat, co admin napsal,
  // ne vyskočit zpátky na původní hodnoty.
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const emailChanged = email.trim().toLowerCase() !== initialEmail;

  return (
    <form action={formAction} className="space-y-3">
      <h2 className={HEADING}>Přihlášení a kontakt</h2>

      <div className="space-y-4 rounded-group bg-surface p-4">
        <input type="hidden" name="client_id" value={clientId} />
        <Field
          label="E-mail"
          hint={
            emailChanged
              ? "Klient se pak přihlašuje novým e-mailem. Heslo zůstává."
              : "Tímhle e-mailem se klient přihlašuje."
          }
        >
          <TextInput
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field label="Telefon" hint="Nepovinné.">
          <TextInput
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="+420 777 123 456"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        <FormError>{state.error}</FormError>
        <SaveButton label="Uložit" pendingLabel="Ukládám…" />
        {state.saved && !state.error && (
          <p className="text-center text-[14px] text-turquoise-700">Uloženo</p>
        )}
      </div>
    </form>
  );
}

export function PasswordForm({ clientId }: { clientId: string }) {
  const [state, formAction] = useActionState<PasswordState, FormData>(
    setClientPassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <h2 className={HEADING}>Heslo</h2>

      <div className="space-y-4 rounded-group bg-surface p-4">
        <input type="hidden" name="client_id" value={clientId} />

        {state.password && (
          <div className="space-y-2">
            <CopyableSecret label="Nové heslo" value={state.password} mono />
            <p className="px-1 text-[13px] leading-snug text-ink-500">
              Staré heslo přestalo platit. Předej klientovi tohle.
            </p>
          </div>
        )}

        <Field
          label="Nové heslo"
          hint={`Nech prázdné a vygeneruju ho. Vlastní musí mít aspoň ${MIN_PASSWORD_LENGTH} znaků.`}
        >
          {/* Text, ne password: admin ho klientovi předává, musí ho vidět. */}
          <TextInput
            name="password"
            type="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="font-mono"
          />
        </Field>

        <FormError>{state.error}</FormError>
        <SaveButton label="Nastavit heslo" pendingLabel="Nastavuju…" />
        <p className="px-1 text-[13px] leading-snug text-ink-500">
          Klient si heslo sám změnit nemůže. Když ho zapomene, nastav mu
          tady nové.
        </p>
      </div>
    </form>
  );
}

function SaveButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" full disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}
