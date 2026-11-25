"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, Select, TextInput, Toggle } from "@/components/ui/Field";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/cn";
import { SESSION_KIND_LABELS, SESSION_SECTIONS } from "@/lib/sessionTemplate";
import type { SortResult } from "@/lib/sessionSort";
import { refineTasks } from "@/lib/sessionTasks";
import { PasteSorter } from "./PasteSorter";
import { ClientPreview } from "./ClientPreview";
import {
  deleteSession,
  saveCoachNote,
  resendSessionEmail,
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
  email,
  prep,
}: {
  session: SessionRecord;
  feedback: SessionFeedback | null;
  clientId: string;
  /** Kolikáté sezení to pro klienta je — do hlavičky náhledu. */
  order: number;
  /** Poznámka pro Honzu k sezení. Klient ji nevidí. */
  coachNote: string;
  /** E-mail se zápisem: jestli je Gmail nastavený a komu půjde. */
  email: { ready: boolean; to: string; name: string };
  /** Příprava na sezení — vlastní blok, který se ukládá sám. */
  prep: React.ReactNode;
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
  const [emailedAt, setEmailedAt] = useState(session.emailed_at ?? null);
  // Poslat e-mail při zveřejnění: zapnuté, dokud jeden neodešel.
  const [sendMail, setSendMail] = useState(email.ready && !session.emailed_at);
  const [mailNote, setMailNote] = useState<{ ok: boolean; text: string }>();
  // clean = nic se nezměnilo, dirty = neuložené změny, saved = právě uloženo.
  const [saveState, setSaveState] = useState<"clean" | "dirty" | "saved">("clean");
  const dirty = saveState === "dirty";
  const setSaved = (value: boolean) => setSaveState(value ? "saved" : "dirty");
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
  // Co se po úpravě úkolů přesunulo jinam — ať Honzu nepřekvapí, že mu
  // řádek z úkolů „zmizel".
  const [taskNotice, setTaskNotice] = useState<string>();

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
    setContent(result.content);
    setTaskNotice(undefined);
    if (result.meta.date) setSessionDate(result.meta.date);
    if (result.meta.kind) setKind(result.meta.kind);
    if (result.privateNote) setCoachNote(result.privateNote);
    setSaved(false);
  }

  /**
   * Po úpravě úkolů nebo doporučení je znovu vyhodnotí: otázka jde
   * k otázce k zamyšlení, tip k doporučením, úkol s termínem zpět k úkolům.
   */
  function recheckTasks() {
    const refined = refineTasks(content);
    const count = (text: string | undefined) =>
      (text ?? "").split("\n").filter((line) => line.trim() !== "").length;

    const questions = count(refined.question) - count(content.question);
    const tips = count(refined.recommendations) - count(content.recommendations);
    if (questions === 0 && tips === 0 && refined.tasks === (content.tasks ?? "").trim()) {
      return;
    }

    const moved = [
      questions > 0 ? `${questions}× otázku do Otázky k zamyšlení` : null,
      tips > 0 ? `${tips}× tip do Nepovinných doporučení` : null,
      tips < 0 ? `${-tips}× úkol z doporučení zpět do Úkolů` : null,
    ].filter(Boolean);

    setContent(refined);
    setSaved(false);
    setTaskNotice(
      moved.length > 0
        ? `Přesunul jsem ${moved.join(", ")}.`
        : "Úkoly jsem znovu prošel a uspořádal.",
    );
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

      const publishing = !published;
      const result = await setSessionStatus({
        sessionId: session.id,
        published: publishing,
        sendEmail: publishing && sendMail,
      });
      if (result.error) return setError(result.error);

      setPublished(publishing);
      setSaved(true);
      reportMail(result);
    });
  }

  function reportMail(result: { emailedTo?: string; emailError?: string }) {
    if (result.emailedTo) {
      setEmailedAt(new Date().toISOString());
      setSendMail(false);
      setMailNote({ ok: true, text: `E-mail se zápisem odešel na ${result.emailedTo}.` });
    } else if (result.emailError) {
      setMailNote({ ok: false, text: result.emailError });
    }
  }

  function resend() {
    setMailNote(undefined);
    startTransition(async () => {
      const failure = await persist();
      if (failure) return setError(failure);
      reportMail(await resendSessionEmail(session.id));
    });
  }

  // Zavření záložky s rozepsaným zápisem: prohlížeč se zeptá, jestli opravdu.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const previewHref = `/admin/klienti/${clientId}/sezeni/${session.id}/email`;

  /**
   * Náhled e-mailu se skládá z uloženého zápisu. S neuloženými změnami
   * (třeba opraveným datem) by ukázal starou verzi, proto se nejdřív uloží.
   * Okno se otevírá hned při kliknutí — po čekání by ho prohlížeč zablokoval.
   */
  function openEmailPreview() {
    const tab = window.open("", "_blank");
    setError(undefined);
    startTransition(async () => {
      const failure = await persist();
      if (failure) {
        tab?.close();
        return setError(failure);
      }
      setSaved(true);
      if (tab) tab.location.href = previewHref;
      else window.location.href = previewHref;
    });
  }
  const emailedLabel = emailedAt
    ? new Date(emailedAt).toLocaleString("cs-CZ", {
        day: "numeric",
        month: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-5">
      {/* Stav na první pohled: co klient vidí a co už proběhlo. */}
      <div className="flex flex-wrap gap-1.5 px-1">
        <StatusChip tone={published ? "turquoise" : "sun"}>
          {published ? "Zveřejněno" : "Koncept · klient ho nevidí"}
        </StatusChip>
        {emailedLabel && <StatusChip>E-mail odeslán {emailedLabel}</StatusChip>}
        {feedback && (
          <StatusChip tone="turquoise">
            {feedback.rating ? `Zpětná vazba · ${feedback.rating}/10` : "Zpětná vazba ✓"}
          </StatusChip>
        )}
      </div>

      {prep}

      <div className="grid gap-3 rounded-[24px] bg-surface p-4 min-[360px]:grid-cols-2">
        <Field label="Datum">
          <TextInput
            type="date"
            value={sessionDate}
            className="px-3 text-[16px]"
            onChange={(event) => {
              setSessionDate(event.target.value);
              setSaved(false);
            }}
          />
        </Field>

        <Field label="Typ">
          <Select
            value={kind}
            className="px-3 text-[16px]"
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

      <Step number={1} title="Vlož zápis" />
      <PasteSorter hasContent={hasContent} onSorted={applySorted} />

      {sorted && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-[24px] px-5 py-4",
            sorted.found.length > 0 ? "bg-turquoise-100" : "bg-sun-surface",
          )}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-[15px] font-bold text-ink">
              {sorted.found.length > 0
                ? `Rozřazeno do ${sorted.found.length} ${sectionsWord(sorted.found.length)}`
                : "V textu jsem nenašel nadpisy"}
            </p>
            <p className="text-[14px] leading-snug text-ink-600">
              {sorted.found.length > 0
                ? "Zkontroluj sekce níž a co nesedí, přepiš."
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
            className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-[13px] font-bold text-turquoise-700 active:opacity-60"
          >
            Vrátit zpět
          </button>
        </div>
      )}

      <Step number={2} title="Zkontroluj a uprav" />
      <div
        role="tablist"
        aria-label="Zobrazení zápisu"
        className="grid grid-cols-2 gap-1 rounded-full bg-surface p-1"
      >
        {(
          [
            ["edit", "Úpravy"],
            ["preview", "Jak to uvidí klient"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={cn(
              "h-11 rounded-full text-[15px] font-bold transition-colors",
              view === value
                ? "bg-ink text-on-ink"
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
          ).map((section) => {
            const filled = (content[section.key] ?? "").trim() !== "";
            return (
              <section
                key={section.key}
                className="space-y-3 rounded-[24px] bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-2 px-1">
                  <h2 className="flex min-w-0 items-center gap-2.5 font-display text-[17px] font-extrabold tracking-tight text-ink">
                    {/* Plná tečka = sekce má obsah; prázdná se klientovi neukáže. */}
                    <span
                      aria-hidden
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        filled
                          ? "bg-turquoise"
                          : "ring-2 ring-inset ring-ink-300",
                      )}
                    />
                    <span className="truncate">{section.title}</span>
                  </h2>
                  {sorted ? (
                    <SortChip filled={filled} found={sorted.found.includes(section.key)} />
                  ) : (
                    !filled && (
                      <span className="shrink-0 text-[12px] font-semibold text-ink-400">
                        prázdné
                      </span>
                    )
                  )}
                </div>
                <MarkdownEditor
                  value={content[section.key] ?? ""}
                  onChange={(value) => setSection(section.key, value)}
                  onBlur={
                    section.key === "tasks" || section.key === "recommendations"
                      ? recheckTasks
                      : undefined
                  }
                  placeholder={section.hint}
                  rows={rowsFor(content[section.key], section.key === "summary" ? 5 : 3)}
                />
                {section.key === "tasks" && taskNotice && (
                  <p className="px-1 text-[13px] font-semibold leading-snug text-turquoise-700">
                    {taskNotice}
                  </p>
                )}
              </section>
            );
          })}

          {/*
            Poznámka pro Honzu: část zápisu „POZNÁMKA PRO HONZU (neposílat)".
            Ukládá se zvlášť do tabulky, kterou klient nepřečte, a v náhledu
            pro klienta se neukazuje.
          */}
          <section className="space-y-2.5 rounded-[24px] bg-night p-5 text-white">
            <h2 className="flex items-center gap-2 font-display text-[17px] font-extrabold tracking-tight">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5 text-sun"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
                <path d="M8 10.5V7a4 4 0 018 0v3.5" />
              </svg>
              Poznámka jen pro tebe
            </h2>
            <p className="text-[13px] leading-snug text-white/65">
              Věci k ověření a citlivá místa. Klient ji nikdy neuvidí, ani v e-mailu.
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
              className="w-full rounded-[16px] border border-white/15 bg-white/[0.08] px-3.5 py-3 text-[16px] leading-relaxed text-white placeholder:text-white/40 focus:border-sun focus:outline-none"
            />
          </section>
        </>
      )}

      <FormError>{error}</FormError>

      <Step number={3} title={published ? "Zveřejněno" : "Zveřejni"} />
      {published ? (
        <section className="space-y-4 rounded-[24px] bg-turquoise-100 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-turquoise text-on-sun">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-display text-[18px] font-extrabold tracking-tight text-ink">
                Klient zápis vidí
              </p>
              <p className="text-[14px] leading-snug text-ink-600">
                Změny se mu projeví hned po uložení.
              </p>
            </div>
          </div>

          {email.ready ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] bg-surface px-4 py-3">
              <p className="min-w-0 text-[14px] leading-snug text-ink-600">
                {emailedLabel
                  ? `E-mail se zápisem odešel ${emailedLabel}.`
                  : "E-mail se zápisem zatím neodešel."}
              </p>
              <button
                type="button"
                disabled={pending}
                onClick={resend}
                className="shrink-0 rounded-full bg-night px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-50"
              >
                {emailedLabel ? "Poslat znovu" : "Poslat e-mail teď"}
              </button>
            </div>
          ) : (
            // Bez propojení s Gmailem tlačítko nejde nabídnout — ale musí
            // být vidět proč, jinak ho Honza marně hledá.
            <div className="space-y-1 rounded-[16px] bg-surface px-4 py-3">
              <p className="text-[14px] font-bold text-ink">
                E-mail zatím poslat nejde
              </p>
              <p className="text-[13px] leading-snug text-ink-600">
                Aplikace ještě není propojená s tvým Gmailem. Ve Vercelu chybí{" "}
                <code className="font-semibold">GMAIL_USER</code> a{" "}
                <code className="font-semibold">GMAIL_APP_PASSWORD</code>. Jakmile
                je doplníš a dáš Redeploy, objeví se tady tlačítko „Poslat e-mail
                teď“.
              </p>
            </div>
          )}

          <MailNote note={mailNote} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <EmailPreviewLink href={previewHref} dirty={dirty} onSaveAndOpen={openEmailPreview} />
            <button
              type="button"
              disabled={pending}
              onClick={togglePublished}
              className="text-[14px] font-bold text-ink-600 underline-offset-2 active:opacity-60 disabled:opacity-50"
            >
              Vrátit do konceptu
            </button>
          </div>
        </section>
      ) : (
        <section className="space-y-4 rounded-[24px] bg-surface p-5">
          <div>
            <p className="font-display text-[18px] font-extrabold tracking-tight text-ink">
              Pustit zápis klientovi
            </p>
            <p className="mt-0.5 text-[14px] leading-snug text-ink-600">
              Teď je to koncept a klient ho nevidí. Po zveřejnění se mu objeví
              v aplikaci.
            </p>
          </div>

          <div
            className={cn(
              "flex items-center gap-3 rounded-[16px] bg-canvas px-4 py-3",
              !email.ready && "opacity-60",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-bold text-ink">
                Poslat i e-mail se zápisem
              </span>
              <span className="block text-[13px] leading-snug text-ink-500">
                {!email.ready
                  ? "Zatím nejde — ve Vercelu chybí GMAIL_USER a GMAIL_APP_PASSWORD."
                  : emailedAt
                    ? "Už jednou odešel. Zapni, jen když ho chceš poslat znovu."
                    : `Na ${email.to}, hned po zveřejnění.`}
              </span>
            </span>
            <Toggle
              checked={sendMail}
              onChange={setSendMail}
              label="Poslat e-mail se zápisem"
              disabled={!email.ready}
            />
          </div>

          <MailNote note={mailNote} />

          <button
            type="button"
            disabled={pending || !hasContent}
            onClick={togglePublished}
            className="flex min-h-[52px] w-full items-center justify-center rounded-full bg-night px-5 text-[16px] font-extrabold text-white transition-opacity active:opacity-80 disabled:opacity-40"
          >
            {pending
              ? "Zveřejňuju…"
              : sendMail
                ? "Zveřejnit a poslat e-mail"
                : "Zveřejnit"}
          </button>
          {!hasContent ? (
            <p className="text-center text-[13px] text-ink-500">
              Nejdřív vlož nebo napiš zápis.
            </p>
          ) : (
            <div className="text-center">
              <EmailPreviewLink href={previewHref} dirty={dirty} onSaveAndOpen={openEmailPreview} />
            </div>
          )}
        </section>
      )}

      {feedback && <FeedbackSummary feedback={feedback} />}

      <DeleteSession
        sessionId={session.id}
        onDeleted={() => router.push(`/admin/klienti/${clientId}/sezeni`)}
      />

      {/*
        Uložit je pořád po ruce. Zápis je dlouhý a tlačítko na jeho konci
        znamenalo po každé opravě sjet až dolů.
      */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+12px)] z-20">
        <div className="flex items-center gap-3 rounded-full bg-night py-2 pl-5 pr-2 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
          <span
            aria-hidden
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              dirty ? "bg-sun" : "bg-turquoise",
            )}
          />
          <span role="status" className="min-w-0 flex-1 truncate text-[14px] font-bold">
            {pending
              ? "Ukládám…"
              : dirty
                ? "Neuložené změny"
                : saveState === "saved"
                  ? "Uloženo"
                  : published
                    ? "Zveřejněno · beze změn"
                    : "Koncept · beze změn"}
          </span>
          <button
            type="button"
            disabled={pending || !dirty}
            onClick={() => save()}
            className="h-11 shrink-0 rounded-full bg-turquoise px-6 text-[15px] font-extrabold text-on-sun transition-opacity active:opacity-80 disabled:bg-white/15 disabled:text-white/50"
          >
            Uložit
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title }: { number: number; title: string }) {
  return (
    <p className="flex items-center gap-2 px-1 pt-1 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-500">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[11px] font-extrabold tracking-normal text-on-ink">
        {number}
      </span>
      {title}
    </p>
  );
}

function StatusChip({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "plain" | "turquoise" | "sun";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1.5 text-[13px] font-bold",
        tone === "turquoise" && "bg-turquoise-100 text-turquoise-700",
        tone === "sun" && "bg-sun-surface text-ink",
        tone === "plain" && "bg-surface text-ink-600",
      )}
    >
      {children}
    </span>
  );
}

function MailNote({ note }: { note?: { ok: boolean; text: string } }) {
  if (!note) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-[16px] px-4 py-3 text-[14px] font-semibold leading-snug",
        note.ok ? "bg-turquoise text-on-sun" : "bg-sun-surface text-ink",
      )}
    >
      {note.text}
    </p>
  );
}

/** S neuloženými změnami náhled nejdřív uloží, jinak je to obyčejný odkaz. */
function EmailPreviewLink({
  href,
  dirty,
  onSaveAndOpen,
}: {
  href: string;
  dirty: boolean;
  onSaveAndOpen: () => void;
}) {
  const className = "inline-block text-[14px] font-bold text-turquoise-700";
  if (dirty) {
    return (
      <button type="button" onClick={onSaveAndOpen} className={className}>
        Uložit a ukázat náhled e-mailu ↗
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener" className={className}>
      Náhled e-mailu ↗
    </a>
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
  const chips = [
    feedback.rating ? `${feedback.rating}/10` : null,
    feedback.feeling || null,
  ].filter((chip): chip is string => Boolean(chip));

  if (chips.length === 0 && !feedback.takeaway && !feedback.favorite_topic) return null;

  return (
    <section className="space-y-3 rounded-[24px] bg-turquoise px-5 py-5 text-on-sun">
      <p className="text-[12px] font-bold uppercase tracking-[0.12em]">
        Zpětná vazba klienta
      </p>
      {feedback.takeaway && (
        <div>
          <p className="text-[13px] font-bold opacity-70">Co si odnáší</p>
          <Markdown
            source={feedback.takeaway}
            tone="accent"
            size="lg"
            className="mt-1 font-display font-bold"
          />
        </div>
      )}
      {feedback.favorite_topic && (
        <div>
          <p className="text-[13px] font-bold opacity-70">Nejvíc ho bavilo</p>
          <Markdown source={feedback.favorite_topic} tone="accent" className="mt-1" />
        </div>
      )}
      {chips.length > 0 && (
        <p className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-white/85 px-3 py-1.5 text-[13px] font-bold"
            >
              {chip}
            </span>
          ))}
        </p>
      )}
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
    // Schválně nenápadné: mazání nemá soutěžit s ukládáním a zveřejněním.
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-[44px] px-4 text-[14px] font-bold text-danger active:opacity-60"
        >
          Smazat sezení
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[24px] bg-surface p-5">
      <p className="font-display text-[18px] font-extrabold tracking-tight text-ink">
        Opravdu smazat?
      </p>
      <p className="text-[15px] leading-snug text-ink-600">
        Smaže zápis i zpětnou vazbu klienta. Nejde to vrátit.
      </p>
      <FormError>{error}</FormError>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-[48px] flex-1 rounded-full bg-canvas px-5 text-[15px] font-bold text-ink"
        >
          Nechat být
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await deleteSession(sessionId);
              if (result.error) return setError(result.error);
              onDeleted();
            })
          }
          className="min-h-[48px] flex-1 rounded-full bg-danger px-5 text-[15px] font-extrabold text-white disabled:opacity-50"
        >
          {pending ? "Mažu…" : "Smazat"}
        </button>
      </div>
    </div>
  );
}
