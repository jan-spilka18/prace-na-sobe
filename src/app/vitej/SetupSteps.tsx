"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { Field, FormError, TextArea, TextInput } from "@/components/ui/Field";
import { MIN_PASSWORD_LENGTH } from "@/lib/config";
import { composeVision } from "@/lib/profile";
import { ProfileForm, type ProfileDraft } from "@/components/ProfileForm";

export type { ProfileDraft };
import { EVERY_DAY, WORKDAYS } from "@/lib/habits";
import { changePassword } from "@/app/actions/account";
import { saveVision } from "@/app/actions/vision";
import { createHabit } from "@/app/actions/habits";
import { PrimaryButton, Rise, SlideHeading } from "./parts";

/*
  Nastavení v průvodci. Každý krok se dá přeskočit tlačítkem nahoře —
  nic tu není povinné. Všechno jde později doplnit v Nastavení, ve
  Přehledu a v Návycích.
*/

// ─── O tobě ───────────────────────────────────────────────────────────────


export function ProfileStep({
  initial,
  onDone,
}: {
  initial: ProfileDraft;
  onDone: () => void;
}) {
  return (
    <div>
      <SlideHeading title="Pár slov o tobě">
        Ať se ti můžu ozvat a nezapomenu ti popřát k narozeninám.
      </SlideHeading>
      <Rise i={2} className="mt-6">
        <ProfileForm initial={initial} submitLabel="Uložit a dál" onSaved={onDone} />
      </Rise>
    </div>
  );
}

// ─── Heslo ────────────────────────────────────────────────────────────────

export function PasswordStep({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await changePassword({}, formData);
      if (result.error) return setError(result.error);
      onDone();
    });
  }

  return (
    <div>
      <SlideHeading title="Vlastní heslo">
        Teď máš heslo ode mě. Nastav si vlastní, ať ho znáš jen ty.
      </SlideHeading>

      <Rise i={2} className="mt-6">
        <form action={submit} className="space-y-4">
          <div className="space-y-4 rounded-group bg-surface p-4">
            <Field label="Heslo, které máš ode mě">
              <TextInput name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field
              label="Nové heslo"
              hint={`Aspoň ${MIN_PASSWORD_LENGTH} znaků. Klidně celá věta.`}
            >
              <TextInput
                name="next"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </Field>
            <Field label="Nové heslo ještě jednou">
              <TextInput
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
              />
            </Field>
          </div>

          <FormError>{error}</FormError>

          <PrimaryButton type="submit" disabled={pending}>
            {pending ? "Měním…" : "Nastavit heslo"}
          </PrimaryButton>
        </form>
      </Rise>
    </div>
  );
}

// ─── Vize ─────────────────────────────────────────────────────────────────

const VISION_QUESTIONS = [
  { label: "Kde chceš být za 90 dní?", placeholder: "Za devadesát dní chci…" },
  { label: "Proč je to pro tebe důležité?", placeholder: "Protože…" },
  { label: "Co ti v tom zatím brání?", placeholder: "Zatím mi brání…" },
];

export function VisionStep({
  programId,
  initial,
  onDone,
}: {
  programId: string;
  initial: string;
  onDone: () => void;
}) {
  // Existující vizi rozloží zpátky do odstavců, ať ji klient nemusí psát znovu.
  const [answers, setAnswers] = useState<string[]>(() => {
    const parts = initial.split(/\n{2,}/).filter((part) => part.trim() !== "");
    return VISION_QUESTIONS.map((_, index) =>
      index < VISION_QUESTIONS.length - 1
        ? (parts[index] ?? "")
        : parts.slice(index).join("\n\n"),
    );
  });
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const vision = composeVision(answers);
  const [headline, ...rest] = vision.split("\n\n");

  function submit() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveVision({ programId, body: vision });
      if (result.error) return setError(result.error);
      onDone();
    });
  }

  return (
    <div>
      <SlideHeading title="Tvoje vize">
        Tři otázky. Odpověz svými slovy — nikdo to hodnotit nebude.
      </SlideHeading>

      <Rise i={2} className="mt-6 space-y-3">
        {VISION_QUESTIONS.map((question, index) => (
          <Field key={question.label} label={question.label}>
            <TextArea
              rows={2}
              value={answers[index]}
              placeholder={question.placeholder}
              onChange={(event) =>
                setAnswers((current) =>
                  current.map((value, i) => (i === index ? event.target.value : value)),
                )
              }
            />
          </Field>
        ))}
      </Rise>

      {/*
        Náhled se skládá živě, jak klient píše. Vypadá stejně jako vize na
        obrazovce Dnes, takže hned vidí, co ho tam bude každý den čekat.
      */}
      <Rise i={3} className="mt-4">
        <div
          className={cn(
            "rounded-group bg-sun-surface px-4 py-3.5 transition-opacity duration-300",
            vision === "" && "opacity-50",
          )}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">
            Takhle ji uvidíš každý den
          </p>
          <p className="mt-1.5 font-display text-[17px] font-semibold leading-snug text-ink">
            {headline || "Tady se objeví tvoje první odpověď."}
          </p>
          {rest.map((paragraph, index) => (
            <p key={index} className="mt-2 text-[14px] leading-relaxed text-ink/70">
              {paragraph}
            </p>
          ))}
        </div>
      </Rise>

      <div className="mt-5 space-y-3">
        <FormError>{error}</FormError>
        <PrimaryButton onClick={submit} disabled={pending || vision === ""}>
          {pending ? "Ukládám…" : "Uložit vizi"}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ─── Návyky ───────────────────────────────────────────────────────────────

type HabitDraft = { title: string; workdays: boolean };

export function HabitsStep({
  programId,
  existing,
  onDone,
}: {
  programId: string;
  existing: string[];
  onDone: (added: number) => void;
}) {
  const [drafts, setDrafts] = useState<HabitDraft[]>([
    { title: "", workdays: false },
    { title: "", workdays: false },
    { title: "", workdays: false },
  ]);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const filled = drafts.filter((draft) => draft.title.trim() !== "");

  function update(index: number, patch: Partial<HabitDraft>) {
    setDrafts((current) =>
      current.map((draft, i) => (i === index ? { ...draft, ...patch } : draft)),
    );
  }

  function submit() {
    setError(undefined);
    startTransition(async () => {
      // Postupně, ne najednou: pořadí se počítá z posledního uloženého
      // návyku a souběžné zápisy by dostaly stejné místo v seznamu.
      for (const draft of filled) {
        const result = await createHabit({
          programId,
          title: draft.title,
          type: "boolean",
          description: "",
          linkUrl: "",
          target: null,
          weekdays: draft.workdays ? WORKDAYS : EVERY_DAY,
        });
        if (result.error) return setError(result.error);
      }
      onDone(filled.length);
    });
  }

  // Honza už návyky předvyplnil — klient je jen uvidí a jde dál.
  if (existing.length > 0) {
    return (
      <div>
        <SlideHeading title="Tvoje návyky">
          Tyhle jsme si domluvili. Cíle, dny a popisy si kdykoli upravíš
          v sekci Návyky.
        </SlideHeading>
        <Rise i={2} className="mt-6 space-y-2">
          {existing.map((title) => (
            <div
              key={title}
              className="flex items-center gap-3 rounded-group border border-hairline bg-surface px-3 py-3"
            >
              <span className="h-8 w-8 shrink-0 rounded-full border-2 border-hairline" />
              <span className="text-[16px] font-semibold text-ink">{title}</span>
            </div>
          ))}
        </Rise>
        <div className="mt-6">
          <PrimaryButton onClick={() => onDone(0)}>Pokračovat</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SlideHeading title="Tvoje návyky">
        Napiš si tři věci, které chceš během výzvy dělat. Cíle a připomínky
        doplníš později v sekci Návyky.
      </SlideHeading>

      <Rise i={2} className="mt-6 space-y-2">
        {drafts.map((draft, index) => (
          <div key={index} className="rounded-group bg-surface p-3">
            <TextInput
              aria-label={`Návyk ${index + 1}`}
              placeholder={["Meditace", "Kliky", "Studená sprcha"][index]}
              value={draft.title}
              onChange={(event) => update(index, { title: event.target.value })}
            />
            <div
              role="radiogroup"
              aria-label="Kdy"
              className="mt-2 grid grid-cols-2 gap-1 rounded-card bg-canvas p-1"
            >
              {[
                { label: "Každý den", workdays: false },
                { label: "Po–Pá", workdays: true },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={draft.workdays === option.workdays}
                  onClick={() => update(index, { workdays: option.workdays })}
                  className={cn(
                    "min-h-[36px] rounded-[0.6rem] text-[14px] font-semibold transition-colors duration-150",
                    draft.workdays === option.workdays
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-500",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Rise>

      <div className="mt-5 space-y-3">
        <FormError>{error}</FormError>
        <PrimaryButton onClick={submit} disabled={pending || filled.length === 0}>
          {pending
            ? "Ukládám…"
            : filled.length === 0
              ? "Uložit návyky"
              : `Uložit ${filled.length} ${filled.length === 1 ? "návyk" : "návyky"}`}
        </PrimaryButton>
      </div>
    </div>
  );
}

// ─── Hotovo ───────────────────────────────────────────────────────────────

export function DoneStep({
  checklist,
  onFinish,
  finishing,
}: {
  checklist: { label: string; done: boolean }[];
  onFinish: (then: string) => void;
  finishing: boolean;
}) {
  return (
    <div>
      <SlideHeading title="Připraveno">
        Začni hned dneškem. Stačí otevřít aplikaci a odškrtnout, co máš hotové.
      </SlideHeading>

      <Rise i={2} className="mt-6">
        <ul className="space-y-2">
          {checklist.map((item, index) => (
            <li
              key={item.label}
              className="flex items-center gap-3 rounded-group bg-surface px-4 py-3"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  item.done ? "onb-pop bg-turquoise text-white" : "bg-canvas text-ink-400",
                )}
                style={{ animationDelay: `${300 + index * 140}ms` }}
              >
                {item.done ? (
                  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5 11-11" />
                  </svg>
                ) : (
                  <span aria-hidden className="text-[13px]">–</span>
                )}
              </span>
              <span className={cn("text-[16px]", item.done ? "text-ink" : "text-ink-500")}>
                {item.label}
              </span>
              <span className="sr-only">{item.done ? "hotovo" : "přeskočeno"}</span>
            </li>
          ))}
        </ul>
        {checklist.some((item) => !item.done) && (
          <p className="mt-2 px-1 text-[13px] leading-snug text-ink-500">
            Co jsi přeskočil/a, doplníš kdykoli — profil v Nastavení, vizi
            v Přehledu, návyky v Návycích.
          </p>
        )}
      </Rise>

      <Rise i={3} className="mt-6 space-y-3">
        <PrimaryButton onClick={() => onFinish("/")} disabled={finishing}>
          {finishing ? "Chvilku…" : "Začít"}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => onFinish("/nastaveni/instalace")}
          disabled={finishing}
          className="min-h-[48px] w-full rounded-card text-[16px] font-semibold text-turquoise-700 active:bg-surface"
        >
          Jak si appku dát na plochu
        </button>
      </Rise>
    </div>
  );
}
