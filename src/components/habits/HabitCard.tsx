"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { actualValueLabel, formatTarget, type HabitForDay } from "@/lib/habits";
import { saveEntry } from "@/app/actions/habits";
import { useCelebration } from "./Celebration";
import type { EntryStatus } from "@/lib/database.types";

export function HabitCard({
  habit,
  date,
  readOnly = false,
}: {
  habit: HabitForDay;
  date: string;
  readOnly?: boolean;
}) {
  const [status, setStatus] = useState<EntryStatus | null>(
    habit.entry?.status ?? null,
  );
  const [actual, setActual] = useState(
    habit.entry?.actual_value?.toString() ?? "",
  );
  const [note, setNote] = useState(habit.entry?.note ?? "");
  const [noteOpen, setNoteOpen] = useState(Boolean(habit.entry?.note));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const celebrate = useCelebration();

  const targetLabel = formatTarget(habit.type, habit.target);
  const needsValue = habit.type !== "boolean";

  function persist(
    next: { status: EntryStatus | null; actual: string; note: string },
    // Gratulace patří ke klepnutí na Splněno, ne k pozdější úpravě
    // poznámky nebo hodnoty na už hotovém dni.
    announceCompletion = false,
  ) {
    setError(undefined);
    startTransition(async () => {
      const parsed = next.actual.trim() === "" ? null : Number(next.actual);
      const result = await saveEntry({
        habitId: habit.id,
        date,
        status: next.status,
        actualValue: Number.isFinite(parsed as number) ? parsed : null,
        note: next.note,
      });

      if (result.error) return setError(result.error);

      if (announceCompletion && result.dayComplete) {
        celebrate(result.streak ?? 1);
      }
    });
  }

  // Druhé klepnutí na stejnou volbu ji vezme zpět — záznam se smaže
  // a den se vrátí do stavu „nevyplněno".
  function choose(value: EntryStatus) {
    const next = status === value ? null : value;
    setStatus(next);
    persist({ status: next, actual, note }, next === "done");
  }

  return (
    <article
      className={cn(
        "rounded-group bg-surface p-4 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold leading-snug text-ink">
            {habit.title}
          </h3>
          {habit.description && (
            <p className="mt-1 text-[14px] leading-snug text-ink-600">
              {habit.description}
            </p>
          )}
        </div>
        {targetLabel && (
          <span className="shrink-0 rounded-full bg-sun px-2.5 py-1 text-[13px] font-semibold text-sun-700">
            {targetLabel}
          </span>
        )}
      </header>

      {habit.link_url && (
        <a
          href={habit.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-medium text-turquoise-700"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-4 w-4"
            fill="currentColor"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
          Otevřít nahrávku
        </a>
      )}

      <div className="mt-4 flex gap-2">
        <Choice
          label="Splněno"
          selected={status === "done"}
          tone="done"
          disabled={readOnly}
          onClick={() => choose("done")}
        />
        <Choice
          label="Nesplněno"
          selected={status === "missed"}
          tone="missed"
          disabled={readOnly}
          onClick={() => choose("missed")}
        />
      </div>

      {status === "done" && needsValue && (
        // Popisek nad polem, ne vedle: na úzkém telefonu se vedle sebe láme.
        <label className="mt-3 block">
          <span className="block text-[15px] text-ink-600">
            {actualValueLabel(habit.type)}{" "}
            <span className="text-ink-500">· nepovinné</span>
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={actual}
            disabled={readOnly}
            placeholder={habit.target?.toString() ?? ""}
            onChange={(event) => setActual(event.target.value)}
            onBlur={() => persist({ status, actual, note })}
            className="mt-1.5 w-28 rounded-card border border-hairline px-3 py-2 text-[17px] focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise-200"
          />
        </label>
      )}

      {status !== null && (
        <div className="mt-3">
          {noteOpen ? (
            <textarea
              value={note}
              disabled={readOnly}
              autoFocus={note === ""}
              placeholder="Jak to šlo? Proč ne?"
              rows={2}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => persist({ status, actual, note })}
              className="w-full resize-none rounded-card border border-hairline px-3 py-2 text-[15px] focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise-200"
            />
          ) : (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setNoteOpen(true)}
              className="text-[15px] text-turquoise-700"
            >
              + Přidat poznámku
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-[14px] text-danger">
          Neuložilo se: {error}
        </p>
      )}
    </article>
  );
}

function Choice({
  label,
  selected,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  tone: "done" | "missed";
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-card",
        "text-[16px] font-semibold transition-colors duration-150",
        "disabled:opacity-50",
        selected && tone === "done" && "bg-turquoise text-white",
        selected && tone === "missed" && "bg-ink text-white",
        !selected && "bg-canvas text-ink-600 active:bg-hairline",
      )}
    >
      {selected && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {tone === "done" ? <path d="M4 12.5l5 5 11-11" /> : <path d="M6 6l12 12M18 6L6 18" />}
        </svg>
      )}
      {label}
    </button>
  );
}
