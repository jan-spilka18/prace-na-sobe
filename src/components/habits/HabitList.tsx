"use client";

import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { HABIT_TYPE_LABELS, describeWeekdays, formatTarget } from "@/lib/habits";
import { archiveHabit, deleteHabit, restoreHabit } from "@/app/actions/habits";
import type { Habit, HabitTarget } from "@/lib/database.types";
import { HabitForm } from "./HabitForm";
import { formatShortDate } from "@/lib/date";
import { targetFor } from "@/lib/habits";

export function HabitList({
  programId,
  habits,
  targets,
  today,
  canSetStart = false,
  programStart,
  programEnd,
}: {
  programId: string;
  habits: Habit[];
  targets: HabitTarget[];
  today: string;
  /** Jen admin: návyk může začít až v průběhu výzvy. */
  canSetStart?: boolean;
  programStart?: string;
  programEnd?: string;
}) {
  const startProps = { canSetStart, programStart, programEnd };
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const active = habits.filter((habit) => !habit.archived_at);
  const archived = habits.filter((habit) => habit.archived_at);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        {active.length === 0 && !adding && (
          <p className="rounded-[24px] bg-surface px-4 py-6 text-center text-[15px] text-ink-600">
            Zatím žádné návyky. Doporučuju začít třemi.
          </p>
        )}

        {active.map((habit, index) =>
          editing === habit.id ? (
            <HabitForm
              key={habit.id}
              programId={programId}
              today={today}
              habit={habit}
              currentTarget={targetFor(targets, habit.id, today)}
              {...startProps}
              onDone={() => setEditing(null)}
            />
          ) : (
            <HabitRow
              key={habit.id}
              number={index + 1}
              habit={habit}
              today={today}
              target={targetFor(targets, habit.id, today)}
              onEdit={() => setEditing(habit.id)}
            />
          ),
        )}

        {adding ? (
          <HabitForm
            programId={programId}
            today={today}
            {...startProps}
            onDone={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-night px-5 text-[16px] font-extrabold text-white transition-opacity active:opacity-80"
          >
            <span aria-hidden className="text-[20px] leading-none">+</span>
            Přidat návyk
          </button>
        )}
      </section>

      {/*
        Honzova zkušenost: kdo si naloží osm návyků, do týdne vzdá všechny.
        Tip se ukazuje, dokud je seznam krátký — pak už by jen kázal.
      */}
      {!canSetStart && active.length <= 3 && (
        <aside className="rounded-[24px] bg-sun-surface px-5 py-4">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-sun-700">
            Méně je víc
          </p>
          <p className="mt-1 text-[15px] leading-snug text-ink">
            Tři návyky, které zvládneš každý den, udělají víc než osm, které
            tě po týdnu přestanou bavit.
          </p>
        </aside>
      )}

      {archived.length > 0 && (
        <section className="space-y-3">
          <h2 className="px-1 font-display text-[20px] font-extrabold tracking-tight text-ink">
            Pozastavené
          </h2>
          <p className="px-1 text-[13px] leading-snug text-ink-500">
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

const ACTION =
  "min-h-[44px] rounded-full bg-canvas px-2 text-[14px] font-bold transition-opacity active:opacity-70 disabled:opacity-50";

function HabitRow({
  number,
  habit,
  today,
  target,
  onEdit,
}: {
  number: number;
  habit: Habit;
  today: string;
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
    <article className="rounded-[24px] bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night font-display text-[15px] font-extrabold text-white"
        >
          {number}
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <h3 className="font-display text-[18px] font-extrabold leading-snug tracking-tight text-ink">
            {habit.title}
          </h3>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{describeWeekdays(habit.weekdays)}</Chip>
            <Chip>{HABIT_TYPE_LABELS[habit.type]}</Chip>
            {targetLabel && <Chip tone="sun">{targetLabel}</Chip>}
            {habit.starts_on && (
              <Chip>
                {habit.starts_on > today ? "začne" : "od"}{" "}
                {formatShortDate(habit.starts_on)}
              </Chip>
            )}
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

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-hairline pt-3">
        <button type="button" className={`${ACTION} text-ink`} onClick={onEdit}>
          Upravit
        </button>
        <button type="button" className={`${ACTION} text-ink`} disabled={pending} onClick={archive}>
          Pozastavit
        </button>
        <button
          type="button"
          className={`${ACTION} text-danger`}
          disabled={pending}
          onClick={remove}
        >
          Smazat
        </button>
      </div>
    </article>
  );
}

function ArchivedRow({ habit }: { habit: Habit }) {
  const [pending, startTransition] = useTransition();

  return (
    <article className="flex items-center gap-3 rounded-[24px] bg-surface p-4">
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

function Chip({
  children,
  tone = "plain",
}: {
  children: ReactNode;
  tone?: "plain" | "sun";
}) {
  return (
    <span
      className={
        tone === "sun"
          ? "rounded-full bg-sun px-2.5 py-1 text-[12px] font-bold text-on-sun"
          : "rounded-full bg-canvas px-2.5 py-1 text-[12px] font-bold text-ink-600"
      }
    >
      {children}
    </span>
  );
}
