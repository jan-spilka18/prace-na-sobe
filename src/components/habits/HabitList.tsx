"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { HABIT_TYPE_LABELS, describeWeekdays, formatTarget } from "@/lib/habits";
import { archiveHabit, deleteHabit, restoreHabit } from "@/app/actions/habits";
import type { Habit, HabitTarget } from "@/lib/database.types";
import { HabitForm } from "./HabitForm";
import { targetFor } from "@/lib/habits";

export function HabitList({
  programId,
  habits,
  targets,
  today,
}: {
  programId: string;
  habits: Habit[];
  targets: HabitTarget[];
  today: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const active = habits.filter((habit) => !habit.archived_at);
  const archived = habits.filter((habit) => habit.archived_at);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        {active.length === 0 && !adding && (
          <p className="rounded-group bg-surface px-4 py-6 text-center text-[15px] text-ink-600">
            Zatím žádné návyky. Doporučuju začít třemi.
          </p>
        )}

        {active.map((habit) =>
          editing === habit.id ? (
            <HabitForm
              key={habit.id}
              programId={programId}
              today={today}
              habit={habit}
              currentTarget={targetFor(targets, habit.id, today)}
              onDone={() => setEditing(null)}
            />
          ) : (
            <HabitRow
              key={habit.id}
              habit={habit}
              target={targetFor(targets, habit.id, today)}
              onEdit={() => setEditing(habit.id)}
            />
          ),
        )}

        {adding ? (
          <HabitForm
            programId={programId}
            today={today}
            onDone={() => setAdding(false)}
          />
        ) : (
          <Button variant="secondary" full onClick={() => setAdding(true)}>
            Přidat návyk
          </Button>
        )}
      </section>

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
            Archivované
          </h2>
          <p className="px-4 text-[13px] leading-snug text-ink-500">
            Nenabízejí se k vyplnění, ale vyplněné dny zůstávají v přehledu.
          </p>
          {archived.map((habit) => (
            <ArchivedRow key={habit.id} habit={habit} />
          ))}
        </section>
      )}
    </div>
  );
}

function HabitRow({
  habit,
  target,
  onEdit,
}: {
  habit: Habit;
  target: number | null;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const targetLabel = formatTarget(habit.type, target);

  function archive() {
    setError(undefined);
    startTransition(async () => {
      const result = await archiveHabit(habit.id);
      if (result.error) setError(result.error);
    });
  }

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await deleteHabit(habit.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <article className="rounded-group bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold text-ink">{habit.title}</h3>
          <p className="mt-0.5 text-[14px] text-ink-500">
            {describeWeekdays(habit.weekdays)}
            {` · ${HABIT_TYPE_LABELS[habit.type]}`}
            {targetLabel && ` · ${targetLabel}`}
          </p>
          {habit.description && (
            <p className="mt-1.5 text-[14px] leading-snug text-ink-600">
              {habit.description}
            </p>
          )}
          {habit.link_url && (
            <p className="mt-1.5 truncate text-[14px] text-turquoise-700">
              {habit.link_url}
            </p>
          )}
        </div>
      </div>

      <FormError>{error}</FormError>

      <div className="mt-4 flex gap-2">
        <Button variant="quiet" className="flex-1" onClick={onEdit}>
          Upravit
        </Button>
        <Button variant="quiet" disabled={pending} onClick={archive}>
          Archivovat
        </Button>
        <Button variant="danger" disabled={pending} onClick={remove}>
          Smazat
        </Button>
      </div>
    </article>
  );
}

function ArchivedRow({ habit }: { habit: Habit }) {
  const [pending, startTransition] = useTransition();

  return (
    <article className="flex items-center gap-3 rounded-group bg-surface p-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[17px] text-ink-600">{habit.title}</h3>
      </div>
      <Button
        variant="quiet"
        disabled={pending}
        onClick={() => startTransition(() => restoreHabit(habit.id).then(() => {}))}
      >
        Obnovit
      </Button>
    </article>
  );
}
