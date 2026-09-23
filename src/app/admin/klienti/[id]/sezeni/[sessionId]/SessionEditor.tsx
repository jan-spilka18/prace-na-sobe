"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Field, FormError, Select, TextInput } from "@/components/ui/Field";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Markdown } from "@/components/Markdown";
import {
  SESSION_KIND_LABELS,
  SESSION_SECTIONS,
} from "@/lib/sessionTemplate";
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
}: {
  session: SessionRecord;
  feedback: SessionFeedback | null;
  clientId: string;
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

  function setSection(key: string, value: string) {
    setContent((current) => ({ ...current, [key]: value }));
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

      {SESSION_SECTIONS.map((section) => (
        <section key={section.key} className="space-y-1.5">
          <h2 className="px-1 text-[13px] font-semibold text-ink-600">
            {section.title}
          </h2>
          <MarkdownEditor
            value={content[section.key] ?? ""}
            onChange={(value) => setSection(section.key, value)}
            placeholder={section.hint}
            rows={section.key === "summary" ? 6 : 4}
          />
        </section>
      ))}

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

      {feedback && (feedback.feeling || feedback.takeaway) && (
        <section className="space-y-3 rounded-group bg-surface p-4">
          <h2 className="font-display text-[19px] font-semibold text-ink">
            Zpětná vazba klienta
          </h2>
          {feedback.feeling && (
            <div>
              <p className="text-[13px] font-semibold text-ink-600">
                Jak se po sezení cítím
              </p>
              <Markdown source={feedback.feeling} className="mt-1" />
            </div>
          )}
          {feedback.takeaway && (
            <div>
              <p className="text-[13px] font-semibold text-ink-600">
                Co jsem si odnesl/a
              </p>
              <Markdown source={feedback.takeaway} className="mt-1" />
            </div>
          )}
        </section>
      )}

      <DeleteSession
        sessionId={session.id}
        onDeleted={() => router.push(`/admin/klienti/${clientId}/sezeni`)}
      />
    </div>
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
