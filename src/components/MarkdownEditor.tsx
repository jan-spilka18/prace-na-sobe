"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Markdown } from "./Markdown";

/**
 * Pole pro zápis s lištou na odrážky a zvýraznění.
 *
 * Píše se do obyčejného textového pole a ukládá se Markdown. Zkopírovaný
 * text odjinud se tím pádem nerozbije a zápis zůstane čitelný i mimo
 * aplikaci — což bude potřeba, až se budou přebírat z nahrávací aplikace.
 *
 * Náhled je na přepínač, aby bylo vidět, jak to uvidí klient.
 */
export function MarkdownEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 6,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  /** Předsadí značku před každý vybraný řádek, nebo před ten s kurzorem. */
  function prefixLines(prefix: (index: number) => string) {
    const field = ref.current;
    if (!field) return;

    const { selectionStart, selectionEnd } = field;
    const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
    const endIndex = value.indexOf("\n", selectionEnd);
    const end = endIndex === -1 ? value.length : endIndex;

    const changed = value
      .slice(start, end)
      .split("\n")
      .map((line, index) => (line.trim() === "" ? line : prefix(index) + line))
      .join("\n");

    const next = value.slice(0, start) + changed + value.slice(end);
    onChange(next);

    // Kurzor musí zůstat v textu, jinak se pole po kliknutí na lištu „ztratí".
    requestAnimationFrame(() => {
      field.focus();
      const shift = next.length - value.length;
      field.setSelectionRange(selectionStart + shift, selectionEnd + shift);
    });
  }

  function wrapSelection(mark: string) {
    const field = ref.current;
    if (!field) return;

    const { selectionStart, selectionEnd } = field;
    if (selectionStart === selectionEnd) return;

    const selected = value.slice(selectionStart, selectionEnd);
    const next =
      value.slice(0, selectionStart) +
      mark +
      selected +
      mark +
      value.slice(selectionEnd);

    onChange(next);

    requestAnimationFrame(() => {
      field.focus();
      field.setSelectionRange(
        selectionStart + mark.length,
        selectionEnd + mark.length,
      );
    });
  }

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface">
      <div className="flex items-center gap-1 border-b border-hairline px-1.5 py-1.5">
        <ToolbarButton label="Odrážky" onClick={() => prefixLines(() => "- ")}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none" />
        </ToolbarButton>

        <ToolbarButton
          label="Číslovaný seznam"
          onClick={() => prefixLines((index) => `${index + 1}. `)}
        >
          <path d="M9 6h11M9 12h11M9 18h11M3 5h1v3M3 11h2l-2 2h2M3 16h2v2H3v2h2" />
        </ToolbarButton>

        <span aria-hidden className="mx-1 h-5 w-px bg-hairline" />

        <ToolbarButton label="Tučně" onClick={() => wrapSelection("**")}>
          <path d="M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z" />
        </ToolbarButton>

        <ToolbarButton label="Kurzíva" onClick={() => wrapSelection("*")}>
          <path d="M14 5h-4M14 19h-4M15 5l-4 14" />
        </ToolbarButton>

        <button
          type="button"
          onClick={() => setPreview((value) => !value)}
          aria-pressed={preview}
          className={cn(
            "ml-auto rounded-card px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
            preview
              ? "bg-turquoise-100 text-turquoise-700"
              : "text-ink-500 active:bg-canvas",
          )}
        >
          Náhled
        </button>
      </div>

      {preview ? (
        <div className="min-h-[7rem] px-3 py-2.5">
          {value.trim() === "" ? (
            <p className="text-[15px] text-ink-400">Zatím prázdné.</p>
          ) : (
            <Markdown source={value} />
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className="block w-full resize-y px-3 py-2.5 text-[16px] leading-relaxed focus:outline-none"
        />
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-card text-ink-600 active:bg-canvas"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}
