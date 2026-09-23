"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/Field";
import { saveVision } from "@/app/actions/vision";
import { cn } from "@/lib/cn";

/**
 * Vize — text, který si klient napíše sám a čte ho každý den.
 *
 * Obsah je čistě na něm, takže tu nejsou žádná návodná pole ani osnova.
 * Prázdné pole s jedinou otázkou vede k vlastním slovům líp než formulář.
 */
export function VisionCard({
  programId,
  body,
  canEdit = true,
}: {
  programId: string;
  body: string;
  canEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [saved, setSaved] = useState(body);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveVision({ programId, body: draft });
      if (result.error) return setError(result.error);
      setSaved(draft.trim());
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <section className="space-y-3 rounded-group bg-surface p-4">
        <h2 className="font-display text-[19px] font-semibold text-ink">
          Moje vize
        </h2>
        <p className="text-[14px] leading-snug text-ink-600">
          Kam jdeš a proč. Piš svými slovy, nikdo jiný to hodnotit nebude.
        </p>

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={7}
          autoFocus
          placeholder="Za devadesát dní chci…"
          className="w-full resize-y rounded-card border border-hairline px-3 py-2 text-[16px] leading-relaxed focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise-200"
        />

        <FormError>{error}</FormError>

        <div className="flex gap-3">
          <Button
            variant="quiet"
            className="flex-1"
            onClick={() => {
              setDraft(saved);
              setEditing(false);
            }}
          >
            Zrušit
          </Button>
          <Button className="flex-1" disabled={pending} onClick={submit}>
            {pending ? "Ukládám…" : "Uložit"}
          </Button>
        </div>
      </section>
    );
  }

  if (saved === "") {
    return (
      <section className="rounded-group bg-surface p-5 text-center">
        <h2 className="font-display text-[19px] font-semibold text-ink">
          Moje vize
        </h2>
        <p className="mx-auto mt-1.5 max-w-xs text-[15px] leading-relaxed text-ink-600">
          Napiš si, kam jdeš a proč. Budeš to mít po ruce každý den.
        </p>
        {canEdit && (
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => setEditing(true)}
          >
            Napsat vizi
          </Button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-group bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[19px] font-semibold text-ink">
          Moje vize
        </h2>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-[15px] text-turquoise-700"
          >
            Upravit
          </button>
        )}
      </div>
      <VisionText body={saved} className="mt-3" />
    </section>
  );
}

/**
 * Vize na denní obrazovce — sbalená do jednoho řádku.
 *
 * Denní obrazovka má unést tři návyky bez scrollování, takže si vize
 * nemůže vzít půl displeje. Jeden řádek stačí jako připomínka, že tam je;
 * kdo si ji chce přečíst celou, klepne.
 */
export function VisionQuote({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);

  if (body.trim() === "") return null;

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      aria-label="Moje vize"
      className="flex w-full items-start gap-3 rounded-group border-l-4 border-sun bg-surface py-2.5 pl-3.5 pr-2.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
          Moje vize
        </span>
        {/*
          `line-clamp` si nastavuje vlastní display, takže se s `block`
          perou o to, který vyhraje. Buď jedno, nebo druhé — nikdy obojí.
        */}
        <span
          className={cn(
            "mt-0.5 whitespace-pre-line font-display text-[15px] leading-snug text-ink",
            expanded ? "block" : "line-clamp-1",
          )}
        >
          {body}
        </span>
      </span>

      <span
        aria-hidden
        className="flex h-8 w-8 shrink-0 items-center justify-center text-ink-400"
      >
        <svg
          viewBox="0 0 24 24"
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            expanded && "rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </button>
  );
}

/** Vlastní slova klienta — serifem, aby se četla jako text, ne jako údaj. */
export function VisionText({
  body,
  className,
}: {
  body: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {body.split(/\n{2,}/).map((paragraph, index) => (
        <p
          key={index}
          className="mb-3 whitespace-pre-line font-display text-[17px] leading-relaxed text-ink last:mb-0"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}
