"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import {
  actualValueLabel,
  describeWeekdays,
  formatTarget,
  type HabitForDay,
} from "@/lib/habits";
import { saveEntry } from "@/app/actions/habits";
import { useCelebration } from "./Celebration";
import { useDayState } from "./DayState";
import type { EntryStatus } from "@/lib/database.types";

/**
 * Jeden návyk na denní obrazovce.
 *
 * Záměrně jediný řádek: tři návyky se mají vejít na obrazovku bez scrollování.
 * Kolečko vlevo je celá denní interakce — jedno klepnutí a hotovo. Detail
 * (nesplněno, skutečná hodnota, poznámka) je schovaný pod šipkou, protože
 * klient obvykle ví, co má dělat, a popis číst nepotřebuje.
 */
export function HabitRow({
  habit,
  date,
}: {
  habit: HabitForDay;
  date: string;
}) {
  const [status, setStatus] = useState<EntryStatus | null>(
    habit.entry?.status ?? null,
  );
  const [actual, setActual] = useState(
    habit.entry?.actual_value?.toString() ?? "",
  );
  const [note, setNote] = useState(habit.entry?.note ?? "");
  // Když už u návyku něco je, otevře se rovnou — jinak by to klient přehlédl.
  const [open, setOpen] = useState(
    Boolean(habit.entry?.note || habit.entry?.actual_value),
  );
  const [error, setError] = useState<string>();
  // Stav čekání se schválně nikde neukazuje. Kolečko se přepne hned při
  // klepnutí a ukládání běží na pozadí; ztlumený řádek by říkal „počkej",
  // i když není na co čekat.
  const [, startTransition] = useTransition();
  const celebrate = useCelebration();
  const day = useDayState();

  const targetLabel = formatTarget(habit.type, habit.target);
  /*
    U návyku bez cíle (ano/ne) by řádek zůstal bez podtitulu a v seznamu
    by vyčníval. Rozvrh je tam užitečnější než prázdno — klient hned vidí,
    proč mu ten návyk v sobotu nevyskočil.
  */
  const scheduleLabel =
    habit.weekdays && habit.weekdays.length < 7
      ? describeWeekdays(habit.weekdays)
      : null;
  const needsValue = habit.type !== "boolean";
  const hasDetail = Boolean(habit.description || habit.link_url) || needsValue;

  function persist(
    next: { status: EntryStatus | null; actual: string; note: string },
    announceCompletion = false,
    rollback?: { status: EntryStatus | null },
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

      if (result.error) {
        /*
          Kolečko se přepnulo dřív, než server odpověděl. Když se uložení
          nepovede, musí se vrátit zpátky — jinak by ukazovalo odškrtnutý
          návyk, který v databázi odškrtnutý není.
        */
        if (rollback) {
          setStatus(rollback.status);
          day?.setStatus(habit.id, rollback.status);
        }
        return setError(result.error);
      }
      if (announceCompletion && result.dayComplete) {
        celebrate(result.streak ?? 1);
      }
    });
  }

  function choose(value: EntryStatus) {
    const previous = status;
    const next = status === value ? null : value;
    setStatus(next);
    day?.setStatus(habit.id, next);
    persist({ status: next, actual, note }, next === "done", {
      status: previous,
    });
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-[22px] transition-colors duration-200",
        status === "done" ? "bg-turquoise-100" : "bg-surface",
      )}
    >
      <div className="flex items-center gap-3 py-3 pl-3 pr-1.5">
        <Tick
          status={status}
          onClick={() => choose("done")}
          label={`Splnit: ${habit.title}`}
        />

        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "truncate text-[17px] font-semibold leading-snug transition-colors",
              status === "missed" ? "text-ink-500 line-through" : "text-ink",
            )}
          >
            {habit.title}
          </h3>
          {(targetLabel || scheduleLabel || status === "missed") && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {status === "missed" && <Chip tone="ink">Nesplněno</Chip>}
              {targetLabel && <Chip tone="sun">{targetLabel}</Chip>}
              {scheduleLabel && (
                <Chip tone="plain" calendar>
                  {scheduleLabel}
                </Chip>
              )}
            </div>
          )}
        </div>

        {(hasDetail || status !== null) && (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? "Skrýt detail" : "Zobrazit detail"}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-ink-400"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className={cn(
                "h-5 w-5 transition-transform duration-200",
                open && "rotate-180",
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 border-t border-hairline px-4 pb-4 pt-3">
          {habit.description && (
            <p className="text-[14px] leading-snug text-ink-600">
              {habit.description}
            </p>
          )}

          {habit.link_url && (
            <a
              href={habit.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[15px] font-medium text-turquoise-700"
            >
              <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Otevřít nahrávku
            </a>
          )}

          {status === "done" && needsValue && (
            <label className="block">
              <span className="block text-[14px] text-ink-600">
                {actualValueLabel(habit.type)}{" "}
                <span className="text-ink-500">· nepovinné</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={actual}
                placeholder={habit.target?.toString() ?? ""}
                onChange={(event) => setActual(event.target.value)}
                onBlur={() => persist({ status, actual, note })}
                className="mt-1.5 w-28 rounded-card border border-hairline px-3 py-2 text-[17px] focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise-200"
              />
            </label>
          )}

          <textarea
            value={note}
            placeholder="Poznámka k dnešku, nepovinné"
            rows={2}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => persist({ status, actual, note })}
            className="w-full resize-none rounded-card border border-hairline px-3 py-2 text-[15px] focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise-200"
          />

          <button
            type="button"
            onClick={() => choose("missed")}
            className={cn(
              "min-h-[40px] w-full rounded-card text-[15px] font-semibold transition-colors",
              status === "missed"
                ? "bg-ink text-on-ink"
                : "bg-canvas text-ink-600 active:bg-hairline",
            )}
          >
            {status === "missed" ? "Označeno jako nesplněné" : "Označit jako nesplněné"}
          </button>

          {error && (
            <p role="alert" className="text-[14px] text-danger">
              Neuložilo se: {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

/** Kolečko vlevo. Jediný cíl, na který klient denně sahá. */
function Tick({
  status,
  onClick,
  label,
}: {
  status: EntryStatus | null;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={status === "done"}
      aria-label={label}
      className="group flex h-12 w-12 shrink-0 items-center justify-center"
    >
      {/*
        Fajfka je tmavá, ne bílá: bílá na tyrkysové má kontrast kolem 2 : 1
        a za sluncem venku by nebyla vidět.
      */}
      <span
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full border-[2.5px]",
          "transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "group-active:scale-90",
          status === "done" && "border-turquoise bg-turquoise text-on-sun",
          status === "missed" && "border-ink bg-ink text-on-ink",
          status === null && "border-ink-300 text-transparent",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {status === "missed" ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 12.5l5 5 11-11" />
          )}
        </svg>
      </span>
    </button>
  );
}

/** Štítek pod názvem návyku: cíl, rozvrh nebo stav. */
function Chip({
  tone,
  calendar = false,
  children,
}: {
  tone: "plain" | "sun" | "ink";
  calendar?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold",
        tone === "plain" && "bg-canvas text-ink-600",
        tone === "sun" && "bg-sun-surface text-ink",
        tone === "ink" && "bg-ink text-on-ink",
      )}
    >
      {calendar && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />
        </svg>
      )}
      {children}
    </span>
  );
}
