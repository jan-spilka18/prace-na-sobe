"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { finishOnboarding } from "@/app/actions/onboarding";
import {
  HabitsSlide,
  OverviewSlide,
  SessionsSlide,
  VisionSlide,
  WelcomeSlide,
} from "./TourSlides";
import {
  DoneStep,
  HabitsStep,
  PasswordStep,
  ProfileStep,
  VisionStep,
  type ProfileDraft,
} from "./SetupSteps";
import { PrimaryButton } from "./parts";

type StepId =
  | "welcome"
  | "tour-habits"
  | "tour-overview"
  | "tour-vision"
  | "tour-sessions"
  | "profile"
  | "password"
  | "vision"
  | "habits"
  | "done";

const TOUR: StepId[] = [
  "welcome",
  "tour-habits",
  "tour-overview",
  "tour-vision",
  "tour-sessions",
];

/**
 * Úvodní průvodce: představení aplikace a pak nastavení.
 *
 * Nic tu není povinné. „Přeskočit" posune o krok dál bez uložení,
 * křížek zavře průvodce úplně. Kdo ho zavře, nic nezkazil — všechno
 * najde i později na svém místě.
 */
export function Onboarding({
  profile,
  programId,
  vision,
  existingHabits,
  needsPassword,
}: {
  profile: ProfileDraft;
  programId: string | null;
  vision: string;
  existingHabits: string[];
  needsPassword: boolean;
}) {
  const router = useRouter();

  /*
    Seznam kroků se zafixuje při otevření a dál se nemění. Po změně hesla
    server stránku přepočítá a needsPassword přijde jako false — kdyby se
    seznam počítal znovu, krok s heslem by z něj vypadl, všechny další by
    se posunuly o jedno místo a klient by přeskočil vizi, aniž by ji viděl.
  */
  const [{ steps, askedForPassword }] = useState(() => {
    const setup: StepId[] = ["profile"];
    if (needsPassword) setup.push("password");
    // Bez programu se vize ani návyky nemají kam uložit.
    if (programId) setup.push("vision", "habits");
    setup.push("done");
    return { steps: [...TOUR, ...setup], askedForPassword: needsPassword };
  });

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [completed, setCompleted] = useState<Partial<Record<StepId, boolean>>>({
    // Předvyplněné návyky od Honzy se počítají jako hotové.
    habits: existingHabits.length > 0,
  });
  const [error, setError] = useState<string>();
  const [finishing, startFinish] = useTransition();

  const step = steps[index];
  const isTour = TOUR.includes(step);
  const isLast = index === steps.length - 1;

  const go = useCallback(
    (to: number) => {
      if (to < 0 || to >= steps.length) return;
      setDirection(to > index ? "forward" : "back");
      setIndex(to);
      // Kroky nastavení bývají delší než obrazovka; nový začíná nahoře.
      window.scrollTo({ top: 0 });
    },
    [index, steps.length],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const back = useCallback(() => go(index - 1), [go, index]);

  function complete(id: StepId) {
    setCompleted((current) => ({ ...current, [id]: true }));
    next();
  }

  function finish(target: string) {
    setError(undefined);
    startFinish(async () => {
      const result = await finishOnboarding();
      if (result.error) return setError(result.error);
      router.replace(target);
    });
  }

  // Šipky na klávesnici — jen v představení a jen mimo pole formuláře,
  // jinak by šipka při psaní přeskočila na jiný slide.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!isTour) return;
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") back();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTour, next, back]);

  // Swipe prstem, taky jen v představení. Svislý pohyb se nepočítá —
  // to člověk scrolluje, ne listuje.
  const touch = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(event: React.TouchEvent) {
    const t = event.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(event: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start || !isTour) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) next();
    else back();
  }

  const checklist = [
    { label: "Profil", done: Boolean(completed.profile) },
    ...(askedForPassword ? [{ label: "Vlastní heslo", done: Boolean(completed.password) }] : []),
    ...(programId
      ? [
          { label: "Vize", done: Boolean(completed.vision) },
          { label: "Návyky", done: Boolean(completed.habits) },
        ]
      : []),
  ];

  return (
    <div
      className="flex min-h-dvh flex-col bg-canvas pt-safe pb-safe"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="mx-auto flex w-full max-w-md items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => finish("/")}
          disabled={finishing}
          aria-label="Zavřít průvodce"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 active:bg-surface"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="flex flex-1 items-center justify-center gap-1.5" aria-hidden>
          {steps.map((id, i) => (
            <span
              key={id}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5 bg-turquoise" : i < index ? "w-1.5 bg-turquoise/50" : "w-1.5 bg-hairline",
              )}
            />
          ))}
        </div>
        <span className="sr-only" aria-live="polite">
          Krok {index + 1} z {steps.length}
        </span>

        {isLast ? (
          <span className="w-[5.5rem]" />
        ) : (
          <button
            type="button"
            onClick={next}
            className="min-h-[44px] w-[5.5rem] shrink-0 rounded-full text-right text-[15px] font-semibold text-ink-500 active:text-ink"
          >
            Přeskočit
          </button>
        )}
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-5 pt-4 pb-8">
        {error && (
          <p role="alert" className="mb-4 rounded-card bg-danger/10 px-4 py-3 text-[15px] text-danger">
            {error}
          </p>
        )}

        {/*
          Klíč podle kroku: React slide při každé změně postaví znovu,
          takže se animace příchodu přehraje pokaždé. Směr podle toho,
          jestli člověk jde dopředu, nebo zpátky.
        */}
        <div key={step} className={direction === "forward" ? "onb-forward" : "onb-back"}>
          {step === "welcome" && <WelcomeSlide />}
          {step === "tour-habits" && <HabitsSlide />}
          {step === "tour-overview" && <OverviewSlide />}
          {step === "tour-vision" && <VisionSlide />}
          {step === "tour-sessions" && <SessionsSlide />}

          {step === "profile" && (
            <ProfileStep initial={profile} onDone={() => complete("profile")} />
          )}
          {step === "password" && <PasswordStep onDone={() => complete("password")} />}
          {step === "vision" && programId && (
            <VisionStep programId={programId} initial={vision} onDone={() => complete("vision")} />
          )}
          {step === "habits" && programId && (
            <HabitsStep
              programId={programId}
              existing={existingHabits}
              // Fajfka v závěru jen tomu, kdo nějaké návyky opravdu má —
              // „Přidám později" bez předvyplněných je přeskočení, ne splnění.
              onDone={(added) =>
                added > 0 || existingHabits.length > 0 ? complete("habits") : next()
              }
            />
          )}
          {step === "done" && (
            <DoneStep checklist={checklist} onFinish={finish} finishing={finishing} />
          )}
        </div>

        {isTour && (
          <div className="mt-8">
            <PrimaryButton onClick={next}>
              {step === "tour-sessions" ? "Pojďme si to nastavit" : "Dál"}
            </PrimaryButton>
          </div>
        )}

        {index > 0 && !isLast && (
          <button
            type="button"
            onClick={back}
            className="mt-3 min-h-[44px] w-full text-[15px] font-semibold text-ink-500 active:text-ink"
          >
            Zpět
          </button>
        )}
      </main>
    </div>
  );
}
