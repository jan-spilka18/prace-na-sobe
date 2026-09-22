"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, TextArea, TextInput } from "@/components/ui/Field";
import { HABIT_TYPE_HINTS, HABIT_TYPE_LABELS } from "@/lib/habits";
import { createHabit, setHabitTarget, updateHabit } from "@/app/actions/habits";
import type { Habit, HabitType } from "@/lib/database.types";

type Props = {
  programId: string;
  today: string;
  habit?: Habit;
  currentTarget?: number | null;
  onDone: () => void;
};

export function HabitForm({
  programId,
  today,
  habit,
  currentTarget,
  onDone,
}: Props) {
  const editing = Boolean(habit);

  const [title, setTitle] = useState(habit?.title ?? "");
  const [type, setType] = useState<HabitType>(habit?.type ?? "boolean");
  const [description, setDescription] = useState(habit?.description ?? "");
  const [linkUrl, setLinkUrl] = useState(habit?.link_url ?? "");
  const [target, setTarget] = useState(currentTarget?.toString() ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const needsTarget = type !== "boolean";
  const targetChanged = needsTarget && Number(target) !== currentTarget;

  function submit() {
    setError(undefined);

    startTransition(async () => {
      if (editing && habit) {
        const result = await updateHabit({
          habitId: habit.id,
          title,
          description,
          linkUrl,
        });
        if (result.error) return setError(result.error);

        if (targetChanged && Number(target) > 0) {
          // Nový cíl platí ode dneška. Starší dny si drží ten původní,
          // protože se do habit_targets přidává řádek, nepřepisuje.
          const targetResult = await setHabitTarget({
            habitId: habit.id,
            target: Number(target),
            effectiveFrom: today,
          });
          if (targetResult.error) return setError(targetResult.error);
        }
      } else {
        const result = await createHabit({
          programId,
          title,
          type,
          description,
          linkUrl,
          target: needsTarget ? Number(target) : null,
        });
        if (result.error) return setError(result.error);
      }

      onDone();
    });
  }

  return (
    <div className="space-y-4 rounded-group bg-surface p-4">
      <Field label="Název">
        <TextInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Meditace + vizualizace"
          autoFocus={!editing}
        />
      </Field>

      {editing ? (
        <Field label="Typ" hint="Typ se po založení nemění.">
          <TextInput value={HABIT_TYPE_LABELS[type]} disabled readOnly />
        </Field>
      ) : (
        <Field label="Typ" hint={HABIT_TYPE_HINTS[type]}>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value as HabitType)}
          >
            {Object.entries(HABIT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {needsTarget && (
        <Field
          label={type === "minutes" ? "Cíl v minutách" : "Cíl v opakováních"}
          hint={
            editing && targetChanged
              ? "Nový cíl bude platit ode dneška. Starší dny si nechají původní."
              : undefined
          }
        >
          <TextInput
            type="number"
            inputMode="numeric"
            min={1}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder={type === "minutes" ? "20" : "50"}
          />
        </Field>
      )}

      <Field label="Popis" hint="Nepovinné.">
        <TextArea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ráno hned po probuzení, vleže."
        />
      </Field>

      <Field label="Odkaz" hint="Nepovinné. Třeba na nahrávku od Honzy.">
        <TextInput
          type="url"
          inputMode="url"
          autoCapitalize="none"
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          placeholder="https://youtube.com/..."
        />
      </Field>

      <FormError>{error}</FormError>

      <div className="flex gap-3">
        <Button variant="quiet" className="flex-1" onClick={onDone}>
          Zrušit
        </Button>
        <Button className="flex-1" disabled={pending} onClick={submit}>
          {pending ? "Ukládám…" : editing ? "Uložit" : "Přidat"}
        </Button>
      </div>
    </div>
  );
}
