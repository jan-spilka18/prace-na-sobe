"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field, FormError, TextInput } from "@/components/ui/Field";
import { updateProgram, type ProgramState } from "@/app/admin/actions";
import type { Program } from "@/lib/database.types";

export function ProgramForm({ program }: { program: Program }) {
  const [state, formAction] = useActionState<ProgramState, FormData>(
    updateProgram,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
        Program
      </h2>

      <div className="space-y-4 rounded-group bg-surface p-4">
        <input type="hidden" name="program_id" value={program.id} />

        <Field
          label="Začátek"
          hint="Posunutí začátku přepočítá číslování dní. Vyplněné záznamy mimo nový rozsah zůstanou uložené."
        >
          <TextInput
            name="start_date"
            type="date"
            required
            defaultValue={program.start_date}
          />
        </Field>

        <Field label="Délka ve dnech">
          <TextInput
            name="duration_days"
            type="number"
            min={1}
            max={3650}
            required
            defaultValue={program.duration_days}
          />
        </Field>

        <FormError>{state.error}</FormError>
        {state.saved && !state.error && (
          <p className="text-[15px] text-turquoise-700">Uloženo.</p>
        )}

        <SaveButton />
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" full disabled={pending}>
      {pending ? "Ukládám…" : "Uložit program"}
    </Button>
  );
}
