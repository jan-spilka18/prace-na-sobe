"use client";

import { FeedbackForm } from "@/components/session/FeedbackForm";
import { FeedbackJump } from "@/components/session/FeedbackJump";
import { SessionArticle } from "@/components/session/SessionArticle";
import {
  filledSections,
  sessionHeading,
  sessionTopics,
} from "@/lib/sessionTemplate";
import type { SessionKind } from "@/lib/database.types";

/**
 * Náhled zápisu očima klienta.
 *
 * Skládá se ze stejných komponent jako klientova stránka, takže se od ní
 * nemůže lišit. Počítá se z toho, co je právě v polích — i z neuloženého.
 */
export function ClientPreview({
  sessionDate,
  kind,
  order,
  content,
}: {
  sessionDate: string;
  kind: SessionKind;
  order: number;
  content: Record<string, string>;
}) {
  const sections = filledSections(content);
  const heading = sessionHeading(sessionDate, kind, order);

  return (
    <section className="space-y-2">
      <p className="px-1 text-[13px] leading-snug text-ink-500">
        Přesně takhle to uvidí klient, včetně neuložených změn.
      </p>

      {/*
        Rámeček telefonu, ať je jasné, kde náhled začíná a končí. Zasahuje
        do okraje stránky (-mx-2), aby obsah uvnitř měl stejnou šířku jako
        u klienta a text se zalamoval stejně.
      */}
      <div className="-mx-2 overflow-hidden rounded-[28px] border border-hairline bg-canvas px-2 pb-6 pt-5">
        <div className="mb-5">
          <p className="font-display text-[34px] font-bold leading-tight tracking-tight text-ink">
            {heading.title}
          </p>
          <p className="mt-1 text-[15px] text-ink-600">{heading.subtitle}</p>
        </div>

        <div className="space-y-5">
          {sections.length > 0 && <FeedbackJump preview />}

          {sections.length === 0 ? (
            <p className="rounded-group bg-surface px-4 py-6 text-center text-[15px] text-ink-600">
              Zápis je zatím prázdný.
            </p>
          ) : (
            <SessionArticle sections={sections} />
          )}

          <FeedbackForm
            sessionId=""
            topics={sessionTopics(content)}
            feedback={null}
            preview
          />
        </div>
      </div>
    </section>
  );
}
