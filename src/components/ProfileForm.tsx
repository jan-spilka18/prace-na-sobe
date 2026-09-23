"use client";

import { useState, useTransition } from "react";
import { Field, FormError, Select, TextInput } from "@/components/ui/Field";
import { MONTH_NAMES, daysInMonth } from "@/lib/profile";
import { saveProfile } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/Button";

export type ProfileDraft = {
  fullName: string;
  phone: string;
  birthDay: number | null;
  birthMonth: number | null;
};

/**
 * Formulář profilu. Stejný v průvodci i v Nastavení — kdo průvodce
 * přeskočí, doplní si údaje tam.
 */
export function ProfileForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial: ProfileDraft;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [day, setDay] = useState<number | null>(initial.birthDay);
  const [month, setMonth] = useState<number | null>(initial.birthMonth);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const maxDay = month ? daysInMonth(month) : 31;

  function submit() {
    setError(undefined);
    setSaved(false);
    startTransition(async () => {
      const result = await saveProfile({
        fullName,
        phone,
        birthDay: day,
        birthMonth: month,
      });
      if (result.error) return setError(result.error);
      setSaved(true);
      onSaved?.();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-group bg-surface p-4">
        <Field label="Celé jméno">
          <TextInput
            value={fullName}
            autoComplete="name"
            onChange={(event) => setFullName(event.target.value)}
          />
        </Field>

        <Field label="Telefon" hint="Nepovinné.">
          <TextInput
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+420 777 123 456"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </Field>

        {/* fieldset, ne Field: dvě pole pod jedním popiskem. */}
        <fieldset>
          <legend className="mb-1.5 px-1 text-[13px] font-semibold text-ink-600">
            Narozeniny
          </legend>
          <div className="grid grid-cols-[5.5rem_1fr] gap-2">
            <Select
              aria-label="Den"
              value={day ?? ""}
              onChange={(event) =>
                setDay(event.target.value === "" ? null : Number(event.target.value))
              }
            >
              <option value="">Den</option>
              {Array.from({ length: maxDay }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}.
                </option>
              ))}
            </Select>
            <Select
              aria-label="Měsíc"
              value={month ?? ""}
              onChange={(event) => {
                const next = event.target.value === "" ? null : Number(event.target.value);
                setMonth(next);
                // 31. ledna → únor by dal neexistující den. Srazí se na poslední.
                if (next && day && day > daysInMonth(next)) setDay(daysInMonth(next));
              }}
            >
              <option value="">Měsíc</option>
              {MONTH_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </div>
          <p className="px-1 pt-1.5 text-[13px] text-ink-500">
            Rok nepotřebuju — stačí mi vědět, kdy ti popřát.
          </p>
        </fieldset>
      </div>

      <FormError>{error}</FormError>

      <Button full onClick={submit} disabled={pending}>
        {pending ? "Ukládám…" : submitLabel}
      </Button>

      {saved && !onSaved && (
        <p className="text-center text-[14px] text-turquoise-700">Uloženo</p>
      )}
    </div>
  );
}
