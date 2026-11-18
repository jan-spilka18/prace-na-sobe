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
  saveCoachNote,
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
  coachNote: initialCoachNote,
}: {
  session: SessionRecord;
  feedback: SessionFeedback | null;
  clientId: string;
  /** Kolikáté sezení to pro klienta je — do hlavičky náhledu. */
  order: number;
  /** Poznámka pro Honzu k sezení. Klient ji nevidí. */
  coachNote: string;
}) {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(session.session_date);
  const [kind, setKind] = useState<SessionKind>(session.kind);
  const [content, setContent] = useState<Record<string, string>>(
    session.content ?? {},
  );
  const [coachNote, setCoachNote] = useState(initialCoachNote);
  const [savedCoachNote, setSavedCoachNote] = useState(initialCoachNote);
  const [published, setPublished] = useState(session.status === "published");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  // Po rozřazení: co se našlo a jak vypadal zápis předtím, ať jde
  // rozřazení vrátit celé — sekce, datum, typ i poznámka.
  const [sorted, setSorted] = useState<{
    found: string[];
    fromHeader: boolean;
    privateNote: boolean;
    previous: {
      content: Record<string, string>;
      sessionDate: string;
      kind: SessionKind;
      coachNote: string;
    };
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
    setSorted({
      found: result.found,
      fromHeader: Boolean(result.meta.date || result.meta.kind),
      privateNote: result.privateNote !== "",
      previous: { content, sessionDate, kind, coachNote },
    });
    setContent({
      ...result.content,
      [TOPICS_KEY]: suggestTopics(result.content).join("\n"),
    });
    if (result.meta.date) setSessionDate(result.meta.date);
    if (result.meta.kind) setKind(result.meta.kind);
    if (result.privateNote) setCoachNote(result.privateNote);
    setSaved(false);
  }

  function undoSorted() {
    if (!sorted) return;
    setContent(sorted.previous.content);
    setSessionDate(sorted.previous.sessionDate);
    setKind(sorted.previous.kind);
    setCoachNote(sorted.previous.coachNote);
    setSorted(null);
    setSaved(false);
  }

  /** Uloží zápis a poznámku pro Honzu. Vrací chybu, nebo nic. */
  async function persist(): Promise<string | undefined> {
    const write = await updateSession({
      sessionId: session.id,
      sessionDate,
      kind,
      content,
    });
    if (write.error) return write.error;

    if (coachNote.trim() !== savedCoachNote.trim()) {
      const note = await saveCoachNote({ sessionId: session.id, note: coachNote });
      if (note.error) return note.error;
      setSavedCoachNote(coachNote);
    }
    return undefined;
  }

  function save() {
    setError(undefined);
    startTransition(async () => {
      const failure = await persist();
      if (failure) return setError(failure);
      setSaved(true);
    });
  }

  function togglePublished() {
    setError(undefined);
    startTransition(async () => {
      // Uloží se nejdřív obsah — publikovat rozepsaný zápis by znamenalo,
      // že klient uvidí starší verzi, než je na obrazovce.
      const failure = await persist();
      if (failure) return setError(failure);

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
                ? `Rozřazeno do ${sorted.found.length} ${sectionsWord(sorted.found.length)}`
                : "V textu jsem nenašel nadpisy"}
            </p>
            <p className="text-[14px] leading-snug text-ink-600">
              {sorted.found.length > 0
                ? "Zkontroluj sekce níž a co nesedí, přepiš. Uloží se, až klikneš na Uložit."
                : "Všechno je ve Shrnutí sezení. Úkoly a body přesuň do jejich sekcí ručně."}
            </p>
            {sorted.fromHeader && (
              <p className="text-[14px] leading-snug text-ink-600">
                Datum a typ sezení jsem převzal z hlavičky.
              </p>
            )}
            {sorted.privateNote && (
              <p className="text-[14px] font-semibold leading-snug text-ink">
                Poznámku pro tebe jsem dal stranou — klient ji neuvidí.
              </p>
            )}
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
          {SESSION_SECTIONS.filter(
            // Starší sekce jen tam, kde v nich něco zůstalo.
            (section) => !section.legacy || (content[section.key] ?? "").trim() !== "",
          ).map((section) => (
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

          {/*
            Poznámka pro Honzu: část zápisu „POZNÁMKA PRO HONZU (neposílat)".
            Ukládá se zvlášť do tabulky, kterou klient nepřečte, a v náhledu
            pro klienta se neukazuje.
          */}
          <section className="space-y-2 rounded-group bg-night p-4 text-white">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-4 w-4 text-sun"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
              </svg>
              Poznámka jen pro tebe
            </h2>
            <p className="text-[13px] leading-snug text-white/65">
              Věci k ověření a citlivá místa. Klient ji nikdy neuvidí.
            </p>
            <textarea
              aria-label="Poznámka jen pro tebe"
              value={coachNote}
              rows={rowsFor(coachNote, 3)}
              placeholder="- K ověření: …"
              onChange={(event) => {
                setCoachNote(event.target.value);
                setSaved(false);
              }}
              className="w-full rounded-card border border-white/15 bg-white/[0.08] px-3.5 py-3 text-[15px] leading-relaxed text-white placeholder:text-white/40 focus:border-turquoise focus:outline-none focus:ring-2 focus:ring-turquoise/30"
            />
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

/** „do 1 sekce", „do 3 sekcí", „do 7 sekcí". */
function sectionsWord(count: number): string {
  return count === 1 ? "sekce" : "sekcí";
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
