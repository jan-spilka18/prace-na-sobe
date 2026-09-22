"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { signIn, type SignInState } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="dal" value={next} />

      <Field label="E-mail">
        <TextInput
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          required
          placeholder="jmeno@example.com"
        />
      </Field>

      <Field label="Heslo">
        <TextInput
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
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
      {pending ? "Přihlašuji…" : "Přihlásit se"}
    </Button>
  );
}
