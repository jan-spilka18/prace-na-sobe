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
 * Zkrácená vize pro denní obrazovku.
 *
 * Zkrácená schválně: delší text by odsunul návyky pod okraj obrazovky
 * a z odškrtávání by se stalo scrollování. Klepnutím se rozbalí.
 */
export function VisionQuote({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);

  if (body.trim() === "") return null;

  return (
    <button
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      className="block w-full rounded-group border-l-4 border-sun bg-surface py-3 pl-4 pr-4 text-left"
    >
      <span className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-500">
        Moje vize
      </span>
      {/*
        `line-clamp` si nastavuje vlastní display, takže se s `block`
        perou o to, který vyhraje. Buď jedno, nebo druhé — nikdy obojí.
      */}
      <span
        className={cn(
          "mt-1 whitespace-pre-line font-display text-[16px] leading-relaxed text-ink",
          expanded ? "block" : "line-clamp-3",
        )}
      >
        {body}
      </span>

      {/* Tlačítko bez popisku vypadá jako obyčejný text a nikdo na něj neklepne. */}
      <span className="mt-1.5 block text-[13px] text-turquoise-700">
        {expanded ? "Sbalit" : "Číst celé"}
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
