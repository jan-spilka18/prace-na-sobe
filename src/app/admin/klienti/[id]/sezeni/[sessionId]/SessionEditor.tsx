"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, TextArea, TextInput } from "@/components/ui/Field";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/cn";
import {
  SESSION_KIND_LABELS,
  SESSION_SECTIONS,
  TOPICS_KEY,
} from "@/lib/sessionTemplate";
import { suggestTopics, type SortResult } from "@/lib/sessionSort";
import { PasteSorter } from "./PasteSorter";
import { ClientPreview } from "./ClientPreview";
import {
  deleteSession,
  setSessionStatus,
  updateSession,
} from "@/app/actions/sessions";
import type {
  SessionFeedback,
  SessionKind,
  SessionRecord,
} from "@/lib/database.types";

export function SessionEditor({
  session,
  feedback,
  clientId,
  order,
}: {
  session: SessionRecord;
  feedback: SessionFeedback | null;
  clientId: string;
  /** Kolikáté sezení to pro klienta je — do hlavičky náhledu. */
  order: number;
}) {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(session.session_date);
  const [kind, setKind] = useState<SessionKind>(session.kind);
  const [content, setContent] = useState<Record<string, string>>(
    session.content ?? {},
  );
  const [published, setPublished] = useState(session.status === "published");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Po rozřazení: které sekce se našly podle nadpisu a co v sekcích bylo
  // předtím, ať jde rozřazení vrátit.
  const [sorted, setSorted] = useState<{
    found: string[];
    previous: Record<string, string>;
  } | null>(null);

  const [view, setView] = useState<"edit" | "preview">("edit");

  const hasContent = SESSION_SECTIONS.some(
    (section) => (content[section.key] ?? "").trim() !== "",
  );

  function setSection(key: string, value: string) {
    setContent((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function applySorted(result: SortResult) {
    setSorted({ found: result.found, previous: content });
    setContent({
      ...result.content,
      [TOPICS_KEY]: suggestTopics(result.content).join("\n"),
    });
    setSaved(false);
  }

  function undoSorted() {
    if (!sorted) return;
    setContent(sorted.previous);
    setSorted(null);
    setSaved(false);
  }

  function save(then?: () => void) {
    setError(undefined);
    startTransition(async () => {
      const result = await updateSession({
        sessionId: session.id,
        sessionDate,
        kind,
        content,
      });
      if (result.error) return setError(result.error);
      setSaved(true);
      then?.();
    });
  }

  function togglePublished() {
    setError(undefined);
    startTransition(async () => {
      // Uloží se nejdřív obsah — publikovat rozepsaný zápis by znamenalo,
      // že klient uvidí starší verzi, než je na obrazovce.
      const write = await updateSession({
        sessionId: session.id,
        sessionDate,
        kind,
        content,
      });
      if (write.error) return setError(write.error);

      const result = await setSessionStatus({
        sessionId: session.id,
        published: !published,
      });
      if (result.error) return setError(result.error);

      setPublished(!published);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      <div className="space-y-4 rounded-group bg-surface p-4">
        <Field label="Datum">
          <TextInput
            type="date"
            value={sessionDate}
            onChange={(event) => {
              setSessionDate(event.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="Typ">
          <Select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as SessionKind);
              setSaved(false);
            }}
          >
            {Object.entries(SESSION_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <PasteSorter hasContent={hasContent} onSorted={applySorted} />

      {sorted && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-group px-4 py-3.5",
            sorted.found.length > 0 ? "bg-turquoise-100" : "bg-sun-surface",
          )}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[15px] font-semibold text-ink">
              {sorted.found.length > 0
                ? `Rozřazeno do ${sorted.found.length} z ${SESSION_SECTIONS.length} sekcí`
                : "V textu jsem nenašel nadpisy"}
            </p>
            <p className="text-[14px] leading-snug text-ink-600">
              {sorted.found.length > 0
                ? "Zkontroluj sekce níž a co nesedí, přepiš. Uloží se, až klikneš na Uložit."
                : "Všechno je ve Shrnutí. Úkoly a body přesuň do jejich sekcí ručně."}
            </p>
          </div>
          <button
            type="button"
            onClick={undoSorted}
            className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[13px] font-semibold text-turquoise-700 active:opacity-60"
          >
            Vrátit zpět
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Zobrazení zápisu"
        className="grid grid-cols-2 gap-1 rounded-full bg-hairline p-1"
      >
        {(
          [
            ["edit", "Úpravy"],
            ["preview", "Náhled pro klienta"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={cn(
              "h-10 rounded-full text-[15px] font-semibold transition-colors",
              view === value
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-600 active:opacity-60",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "preview" ? (
        <ClientPreview
          sessionDate={sessionDate}
          kind={kind}
          order={order}
          content={content}
        />
      ) : (
        <>
          {SESSION_SECTIONS.map((section) => (
            <section key={section.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="text-[13px] font-semibold text-ink-600">
                  {section.title}
                </h2>
                {sorted && (
                  <SortChip
                    filled={(content[section.key] ?? "").trim() !== ""}
                    found={sorted.found.includes(section.key)}
                  />
                )}
              </div>
              <MarkdownEditor
                value={content[section.key] ?? ""}
                onChange={(value) => setSection(section.key, value)}
                placeholder={section.hint}
                rows={rowsFor(content[section.key], section.key === "summary" ? 6 : 4)}
              />
            </section>
          ))}

          {/*
            Témata pro otázku „Co tě dnes bavilo nejvíc?" ve zpětné vazbě.
            Po rozřazení se navrhnou samy z hlavních bodů; jsou to jen návrhy.
          */}
          <section className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <h2 className="text-[13px] font-semibold text-ink-600">
                Témata pro zpětnou vazbu
              </h2>
              <button
                type="button"
                onClick={() =>
                  setSection(TOPICS_KEY, suggestTopics(content).join("\n"))
                }
                className="text-[13px] font-semibold text-turquoise-700 active:opacity-60"
              >
                Navrhnout z hlavních bodů
              </button>
            </div>
            <TextArea
              aria-label="Témata pro zpětnou vazbu"
              value={content[TOPICS_KEY] ?? ""}
              rows={rowsFor(content[TOPICS_KEY], 4)}
              placeholder={"Jedno téma na řádek, třeba:\nSpánek\nHranice v práci"}
              onChange={(event) => setSection(TOPICS_KEY, event.target.value)}
            />
            <p className="px-1 text-[13px] leading-snug text-ink-500">
              Klient z nich vybere, co ho bavilo nejvíc, nebo napíše vlastní
              odpověď do „Jiné“. Pár slov na téma, nejvýš 8.
            </p>
          </section>
        </>
      )}

      <FormError>{error}</FormError>

      <div className="space-y-3 rounded-group bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold text-ink">
            {published ? "Publikováno" : "Koncept"}
          </span>
          {saved && (
            <span className="text-[14px] text-turquoise-700">Uloženo</span>
          )}
        </div>

        <p className="text-[14px] leading-snug text-ink-600">
          {published
            ? "Klient zápis vidí. Změny se projeví hned po uložení."
            : "Klient tenhle zápis nevidí, dokud ho nepublikuješ."}
        </p>

        <div className="flex gap-3">
          <Button
            variant="quiet"
            className="flex-1"
            disabled={pending}
            onClick={() => save()}
          >
            {pending ? "Ukládám…" : "Uložit"}
          </Button>
          <Button
            variant={published ? "quiet" : "primary"}
            className="flex-1"
            disabled={pending}
            onClick={togglePublished}
          >
            {published ? "Vrátit do konceptu" : "Uložit a publikovat"}
          </Button>
        </div>
      </div>

      {feedback && <FeedbackSummary feedback={feedback} />}

      <DeleteSession
        sessionId={session.id}
        onDeleted={() => router.push(`/admin/klienti/${clientId}/sezeni`)}
      />
    </div>
  );
}

/**
 * Výška políčka podle textu v něm. Po rozřazení přijde do sekcí hotový
 * text a v nízkém políčku by se musel posouvat, aby šel zkontrolovat.
 * Zhruba 38 znaků na řádek na telefonu; víc než 16 řádků už ne.
 */
function rowsFor(text: string | undefined, min: number): number {
  const lines = (text ?? "")
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / 38)), 0);
  return Math.min(16, Math.max(min, lines + 1));
}

function SortChip({ filled, found }: { filled: boolean; found: boolean }) {
  const [label, tone] = !filled
    ? ["Prázdné", "bg-canvas text-ink-500"]
    : found
      ? ["Rozřazeno", "bg-turquoise-100 text-turquoise-700"]
      : ["Zbylý text", "bg-sun-surface text-ink"];
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[12px] font-semibold", tone)}>
      {label}
    </span>
  );
}

function FeedbackSummary({ feedback }: { feedback: SessionFeedback }) {
  const rows = [
    feedback.rating ? { label: "Hodnocení", value: `${feedback.rating}/10` } : null,
    feedback.favorite_topic
      ? { label: "Nejvíc bavilo", value: feedback.favorite_topic }
      : null,
    feedback.feeling ? { label: "Po sezení", value: feedback.feeling } : null,
  ].filter((row) => row !== null);

  if (rows.length === 0 && !feedback.takeaway) return null;

  return (
    <section className="space-y-3 rounded-group bg-surface p-4">
      <h2 className="font-display text-[19px] font-semibold text-ink">
        Zpětná vazba klienta
      </h2>
      {feedback.takeaway && (
        <div>
          <p className="text-[13px] font-semibold text-ink-600">Co si odnáší</p>
          <Markdown source={feedback.takeaway} className="mt-1" />
        </div>
      )}
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-semibold text-ink-600">{row.label}</p>
          <p className="text-right text-[15px] font-semibold text-ink">{row.value}</p>
        </div>
      ))}
    </section>
  );
}

function DeleteSession({
  sessionId,
  onDeleted,
}: {
  sessionId: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="danger" full onClick={() => setConfirming(true)}>
        Smazat sezení
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-group bg-surface p-4">
      <p className="text-[15px] leading-relaxed text-ink-600">
        Smaže zápis i zpětnou vazbu klienta. Nejde to vrátit.
      </p>
      <FormError>{error}</FormError>
      <div className="flex gap-3">
        <Button
          variant="quiet"
          className="flex-1"
          onClick={() => setConfirming(false)}
        >
          Zpět
        </Button>
        <Button
          variant="danger"
          className="flex-1"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteSession(sessionId);
              if (result.error) return setError(result.error);
              onDeleted();
            })
          }
        >
          {pending ? "Mažu…" : "Smazat"}
        </Button>
      </div>
    </div>
  );
}
