"use client";

import { useState } from "react";
import { sortSessionText, type SortResult } from "@/lib/sessionSort";

/**
 * Vložení celého zápisu jedním kusem.
 *
 * Honza zkopíruje zápis (z Claude nebo z nahrávací aplikace) a aplikace
 * ho podle nadpisů rozřadí do sekcí níž. Výsledek je návrh: v políčkách se
 * dá dál upravit a celé rozřazení vrátit zpět.
 */
export function PasteSorter({
  hasContent,
  onSorted,
}: {
  hasContent: boolean;
  onSorted: (result: SortResult) => void;
}) {
  // Nové sezení otevře vložení rovnou — kvůli tomu se sem většinou jde.
  const [open, setOpen] = useState(!hasContent);
  const [raw, setRaw] = useState("");
  const [clipboardNote, setClipboardNote] = useState<string>();

  /** Jedno klepnutí místo podržení prstu a „Vložit" — hlavně na telefonu. */
  async function pasteFromClipboard() {
    setClipboardNote(undefined);
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim() === "") return setClipboardNote("Ve schránce nic není.");
      setRaw(text);
    } catch {
      setClipboardNote("Schránku se nepodařilo přečíst. Vlož text do pole ručně.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-surface px-5 text-[15px] font-extrabold text-ink transition-colors active:bg-canvas"
      >
        <ClipboardIcon />
        Vložit nový zápis a rozřadit
      </button>
    );
  }

  return (
    <section className="space-y-3.5 rounded-[24px] bg-turquoise-100 p-5">
      <div className="space-y-1.5">
        <h2 className="font-display text-[20px] font-extrabold tracking-tight text-ink">
          Vlož celý zápis
        </h2>
        <p className="text-[14px] leading-snug text-ink-600">
          Zkopíruj výstup z Claude a vlož ho sem. Podle nadpisů ho rozřadím do
          sekcí, převezmu datum a typ a poznámku pro tebe dám stranou.
        </p>
      </div>

      <textarea
        aria-label="Celé shrnutí ze sezení"
        value={raw}
        rows={raw === "" ? 5 : 10}
        placeholder={"Datum: 18. 11. 2026\nTyp: Koučink\n\nShrnutí sezení\n…"}
        onChange={(event) => setRaw(event.target.value)}
        className="w-full resize-y rounded-[16px] border border-transparent bg-surface px-4 py-3 text-[16px] leading-relaxed text-ink placeholder:text-ink-400 focus:border-turquoise focus:outline-none"
      />

      {clipboardNote && (
        <p className="px-1 text-[13px] leading-snug text-ink-600">{clipboardNote}</p>
      )}

      {hasContent && (
        <p className="px-1 text-[13px] leading-snug text-ink-600">
          Přepíše, co už v sekcích je. Když se rozřazení nepovede, vrátíš ho
          jedním klepnutím.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {raw.trim() === "" ? (
          <button
            type="button"
            onClick={pasteFromClipboard}
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-night px-5 text-[15px] font-extrabold text-white transition-opacity active:opacity-80"
          >
            <ClipboardIcon />
            Vložit ze schránky
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onSorted(sortSessionText(raw));
              setRaw("");
              setOpen(false);
            }}
            className="min-h-[48px] flex-1 rounded-full bg-night px-5 text-[15px] font-extrabold text-white transition-opacity active:opacity-80"
          >
            Rozřadit do sekcí
          </button>
        )}
        {(hasContent || raw !== "") && (
          <button
            type="button"
            onClick={() => {
              if (raw !== "") return setRaw("");
              setOpen(false);
            }}
            className="min-h-[48px] rounded-full bg-surface px-5 text-[15px] font-bold text-ink"
          >
            {raw !== "" ? "Smazat" : "Zavřít"}
          </button>
        )}
      </div>
    </section>
  );
}

function ClipboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" />
      <path d="M9 4.5V4a1.5 1.5 0 011.5-1.5h3A1.5 1.5 0 0115 4v.5M9 11h6M9 15h4" />
    </svg>
  );
}
