"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { changePassword, type ChangePasswordState } from "@/app/actions/account";
import { MIN_PASSWORD_LENGTH } from "@/lib/config";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    {},
  );

  if (state.ok) {
    return (
      <div className="rounded-group bg-surface px-6 py-10 text-center">
        <p className="text-[17px] font-semibold text-ink">Heslo je změněné</p>
        <p className="mx-auto mt-2 max-w-xs text-[15px] leading-relaxed text-ink-600">
          Příště se přihlas tím novým. Zůstáváš přihlášený/á, odhlašovat se
          nemusíš.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-4 rounded-group bg-surface p-4">
        <Field label="Současné heslo">
          <TextInput
            name="current"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>

        <Field
          label="Nové heslo"
          hint={`Aspoň ${MIN_PASSWORD_LENGTH} znaků. Klidně celá věta — delší je lepší než složitější.`}
        >
          <TextInput
            name="next"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </Field>

        <Field label="Nové heslo ještě jednou">
          <TextInput
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </Field>
      </div>

      <FormError>{state.error}</FormError>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Měním…" : "Změnit heslo"}
      </Button>
    </form>
  );
}
