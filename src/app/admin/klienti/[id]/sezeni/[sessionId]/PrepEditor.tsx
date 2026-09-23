"use client";

import { useState, useTransition } from "react";
import { PrivateBlock } from "@/components/PrivateBlock";
import { savePrep } from "@/app/actions/private";

/**
 * Příprava na sezení — co si chce Honza připomenout, než začne.
 *
 * Schválně prosté pole bez osnovy: příprava vzniká v běhu, pár minut před
 * sezením, a formulář by ji jen zdržoval.
 */
export function PrepEditor({
  sessionId,
  initial,
}: {
  sessionId: string;
  initial: string;
}) {
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

  return (
    <PrivateBlock
      title="Příprava"
      hint="Jen pro tebe. Klient tohle nevidí ani po publikování."
      action={
        <span className="shrink-0 text-[13px] text-white/60">
          {pending ? "Ukládám…" : saved ? "Uloženo" : "Neuloženo"}
        </span>
      }
    >
      <textarea
        value={content}
        rows={5}
        placeholder="Na co se zeptat, co si ohlídat, kde jsme minule skončili…"
        onChange={(event) => {
          setContent(event.target.value);
          setSaved(false);
        }}
        onBlur={persist}
        className="w-full resize-y rounded-card border border-white/15 bg-white/10 px-3 py-2.5 text-[15px] leading-relaxed text-white placeholder:text-white/40 focus:border-sun focus:outline-none"
      />

      {error && (
        <p role="alert" className="mt-2 text-[14px] text-sun">
          Neuložilo se: {error}
        </p>
      )}
    </PrivateBlock>
  );
}
