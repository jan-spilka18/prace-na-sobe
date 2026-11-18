"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { sortSessionText, type SortResult } from "@/lib/sessionSort";

/**
 * Vložení celého zápisu jedním kusem.
 *
 * Honza zkopíruje shrnutí ze sezení (třeba z nahrávací aplikace) a aplikace
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

  if (!open) {
    return (
      <Button variant="quiet" full onClick={() => setOpen(true)}>
        Vložit celý zápis a rozřadit
      </Button>
    );
  }

  return (
    <section className="space-y-3 rounded-group bg-surface p-4">
      <div className="space-y-1">
        <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">
          Vlož celé shrnutí
        </h2>
        <p className="text-[14px] leading-snug text-ink-600">
          Klidně tak, jak ti ho dala nahrávací aplikace. Nadpisy jako „Klíčové
          body“ nebo „Další kroky“ poznám a text pod nimi dám do správné sekce.
        </p>
      </div>

      <TextArea
        aria-label="Celé shrnutí ze sezení"
        value={raw}
        rows={10}
        placeholder={"Shrnutí\n…\n\nKlíčové body:\n- …\n\nÚkoly do příště:\n1. …"}
        onChange={(event) => setRaw(event.target.value)}
      />

      {hasContent && (
        <p className="px-1 text-[13px] leading-snug text-ink-500">
          Přepíše, co už v sekcích je. Když se rozřazení nepovede, vrátíš ho
          jedním klepnutím.
        </p>
      )}

      <div className="flex gap-3">
        {hasContent && (
          <Button variant="quiet" className="flex-1" onClick={() => setOpen(false)}>
            Zavřít
          </Button>
        )}
        <Button
          className="flex-1"
          disabled={raw.trim() === ""}
          onClick={() => {
            onSorted(sortSessionText(raw));
            setRaw("");
            setOpen(false);
          }}
        >
          Rozřadit do sekcí
        </Button>
      </div>
    </section>
  );
}
