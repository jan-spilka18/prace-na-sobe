"use client";

import { useState, useTransition } from "react";
import { savePrep } from "@/app/actions/private";
import { cn } from "@/lib/cn";

/**
 * Příprava na sezení — co si chce Honza připomenout, než začne.
 *
 * Schválně prosté pole bez osnovy: příprava vzniká v běhu, pár minut před
 * sezením, a formulář by ji jen zdržoval.
 *
 * Tmavý podklad značí „jen pro tebe". Po sezení, když už je zápis napsaný,
 * se příprava sbalí do jednoho řádku — tehdy už jen překáží v cestě
 * k zápisu, ale pořád je na jedno klepnutí.
 */
export function PrepEditor({
  sessionId,
  initial,
  defaultOpen,
}: {
  sessionId: string;
  initial: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [content, setContent] = useState(initial);
  const [saved, setSaved] = useState(true);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function persist() {
    if (saved) return;
    setError(undefined);
    startTransition(async () => {
      const result = await savePrep({ sessionId, content });
      if (result.error) return setError(result.error);
      setSaved(true);
    });
  }

  const firstLine = content.trim().split("\n")[0] ?? "";

  return (
    <section className="rounded-[24px] bg-night text-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <LockIcon />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[17px] font-semibold tracking-tight">
            Příprava
          </span>
          <span className="block truncate text-[13px] text-white/60">
            {open
              ? "Jen pro tebe"
              : firstLine || "Prázdná · jen pro tebe"}
          </span>
        </span>
        {open && (
          <span className="shrink-0 text-[13px] text-white/60">
            {pending ? "Ukládám…" : saved ? "Uloženo" : "Neuloženo"}
          </span>
        )}
        <svg
          viewBox="0 0 14 8"
          aria-hidden
          className={cn(
            "h-2 w-3.5 shrink-0 text-white/60 transition-transform duration-200",
            open && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 1l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5">
          <textarea
            aria-label="Příprava na sezení"
            value={content}
            rows={5}
            placeholder="Na co se zeptat, co si ohlídat, kde jsme minule skončili…"
            onChange={(event) => {
              setContent(event.target.value);
              setSaved(false);
            }}
            onBlur={persist}
            className="w-full resize-y rounded-[16px] border border-white/15 bg-white/[0.08] px-3.5 py-3 text-[16px] leading-relaxed text-white placeholder:text-white/40 focus:border-sun focus:outline-none"
          />

          {error && (
            <p role="alert" className="mt-2 text-[14px] text-sun">
              Neuložilo se: {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-5 w-5 shrink-0 text-sun"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  );
}
