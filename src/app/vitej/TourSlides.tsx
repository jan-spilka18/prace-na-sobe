"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { WELCOME_TEXT } from "@/lib/config";
import { Rise, SlideHeading, TryHint } from "./parts";

/*
  Představení aplikace. Každý slide ukazuje jednu část a má ukázku, na
  kterou jde klepnout — vypadá jako skutečná aplikace, jen nic neukládá.
  Kdo si to jednou zkusí tady, pozná to pak na obrazovce Dnes.
*/

// ─── 1. Vítej ─────────────────────────────────────────────────────────────

export function WelcomeSlide() {
  // Klepnutí na ikonu přehraje růst sloupců znovu — přes nový klíč.
  const [replay, setReplay] = useState(0);

  return (
    <div>
      <Rise i={0}>
        <button
          type="button"
          onClick={() => setReplay((n) => n + 1)}
          aria-label="Přehrát animaci znovu"
          className="mb-7 block rounded-[26px] active:scale-95 transition-transform"
        >
          <svg key={replay} viewBox="0 0 160 160" className="h-24 w-24" aria-hidden>
            <rect width="160" height="160" rx="36" fill="#171717" />
            {[
              { x: 34, y: 92, h: 38, fill: "#5FC3CE", opacity: 0.55, delay: 120 },
              { x: 68, y: 70, h: 60, fill: "#5FC3CE", opacity: 1, delay: 240 },
              { x: 102, y: 40, h: 90, fill: "#FFF0A6", opacity: 1, delay: 360 },
            ].map((bar) => (
              <rect
                key={bar.x}
                x={bar.x}
                y={bar.y}
                width="24"
                height={bar.h}
                rx="8"
                fill={bar.fill}
                opacity={bar.opacity}
                className="onb-grow-bar"
                style={{
                  transformBox: "fill-box",
                  transformOrigin: "bottom",
                  animation: `onb-grow 620ms var(--ease-ios) ${bar.delay}ms both`,
                }}
              />
            ))}
          </svg>
        </button>
      </Rise>

      <SlideHeading title="Vítej">{WELCOME_TEXT}</SlideHeading>

      <Rise i={2}>
        <p className="mt-5 font-display text-[17px] font-semibold text-ink">
          Honza
        </p>
      </Rise>

      <Rise i={3}>
        <p className="mt-8 text-[15px] leading-relaxed text-ink-500">
          Na dalších stránkách ti ukážu, co všechno aplikace umí. Klidně je
          přeskoč — všechno najdeš i později.
        </p>
      </Rise>
    </div>
  );
}

// ─── 2. Návyky ────────────────────────────────────────────────────────────

const DEMO_HABITS = [
  { id: "a", title: "Meditace", subtitle: "15 min" },
  { id: "b", title: "Kliky", subtitle: "50×" },
  { id: "c", title: "Studená sprcha", subtitle: "Po–Pá" },
];

export function HabitsSlide() {
  const [done, setDone] = useState<Record<string, boolean>>({ a: true });
  const count = Object.values(done).filter(Boolean).length;
  const all = count === DEMO_HABITS.length;

  return (
    <div>
      <SlideHeading title="Každý den pár vteřin">
        Na obrazovce Dnes odškrtneš, co máš hotové. Jedno klepnutí na kolečko
        a je to.
      </SlideHeading>

      <Rise i={2} className="mt-7">
        <TryHint />
        <div
          className={cn(
            "rounded-sheet px-4 py-3 text-white transition-colors duration-500",
            all
              ? "bg-gradient-to-br from-turquoise to-turquoise-deep"
              : "bg-gradient-to-br from-night to-night-2",
          )}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] text-white/60">Dnes</span>
            <span className="font-display text-[19px] font-bold tabular-nums">
              {count} ze {DEMO_HABITS.length}
            </span>
          </div>
          <div aria-hidden className="mt-2 flex gap-1">
            {DEMO_HABITS.map((habit) => (
              <span
                key={habit.id}
                className={cn(
                  "h-1 w-6 rounded-full transition-colors duration-300",
                  done[habit.id] ? (all ? "bg-white" : "bg-turquoise") : "bg-white/15",
                )}
              />
            ))}
          </div>
        </div>

        <div className="mt-2 space-y-2">
          {DEMO_HABITS.map((habit) => {
            const checked = Boolean(done[habit.id]);
            return (
              <button
                key={habit.id}
                type="button"
                aria-pressed={checked}
                onClick={() => setDone((d) => ({ ...d, [habit.id]: !d[habit.id] }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-group border px-3 py-2.5 text-left transition-colors duration-200",
                  checked ? "border-turquoise-200 bg-turquoise-50" : "border-hairline bg-surface",
                )}
              >
                <span
                  key={String(checked)}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                    checked
                      ? "onb-pop border-turquoise bg-turquoise text-white"
                      : "border-hairline text-transparent",
                  )}
                >
                  <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5l5 5 11-11" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[16px] font-semibold text-ink">
                    {habit.title}
                  </span>
                  <span className="block text-[13px] text-ink-500">{habit.subtitle}</span>
                </span>
              </button>
            );
          })}
        </div>

        <p
          aria-live="polite"
          className={cn(
            "mt-3 px-1 text-[15px] font-semibold text-turquoise-700 transition-opacity duration-300",
            all ? "opacity-100" : "opacity-0",
          )}
        >
          {all ? "Den splněný. Takhle to vypadá, když máš hotovo." : " "}
        </p>
      </Rise>
    </div>
  );
}

// ─── 3. Přehled ───────────────────────────────────────────────────────────

type DemoDay = {
  label: string;
  day: number;
  state: "complete" | "incomplete" | "empty" | "rest" | "today";
};

const DEMO_WEEK: DemoDay[] = [
  { label: "Po", day: 21, state: "complete" },
  { label: "Út", day: 22, state: "incomplete" },
  { label: "St", day: 23, state: "complete" },
  { label: "Čt", day: 24, state: "empty" },
  { label: "Pá", day: 25, state: "today" },
  { label: "So", day: 26, state: "rest" },
  { label: "Ne", day: 27, state: "rest" },
];

const DAY_MEANING: Record<DemoDay["state"], string> = {
  complete: "Splněno — všechno odškrtnuté.",
  incomplete: "Nesplněno — něco ten den nevyšlo. I to se počítá, poctivost je víc než série.",
  empty: "Nevyplněno — ten den chybí záznam. Dá se doplnit zpětně.",
  rest: "Volno — na ten den nemáš naplánovaný žádný návyk. Nic se nezlomí.",
  today: "Dnes — kroužek ukazuje, kde právě jsi.",
};

export function OverviewSlide() {
  const [picked, setPicked] = useState<number>(1);
  const minutes = useCountUp(1110);

  return (
    <div>
      <SlideHeading title="Celá cesta na jednom místě">
        V Přehledu uvidíš všech 90 dní, jak ti jde který návyk a kolik toho
        máš za sebou.
      </SlideHeading>

      <Rise i={2} className="mt-7">
        <TryHint>Klepni na den</TryHint>
        <div className="rounded-group bg-surface px-2 py-3">
          <ol className="flex justify-between">
            {DEMO_WEEK.map((day, index) => (
              <li key={day.day} className="flex flex-1 justify-center">
                <button
                  type="button"
                  onClick={() => setPicked(index)}
                  aria-pressed={picked === index}
                  aria-label={`${day.label} ${day.day}.`}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className={cn("text-[10px] font-semibold uppercase", picked === index ? "text-turquoise-700" : "text-ink-400")}>
                    {day.label}
                  </span>
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-semibold tabular-nums transition-transform duration-150",
                      picked === index && "scale-110",
                      day.state === "complete" && "bg-turquoise text-white",
                      day.state === "incomplete" && "bg-ink text-on-ink",
                      day.state === "empty" && "bg-canvas text-ink-600 ring-1 ring-inset ring-hairline",
                      day.state === "rest" && "text-ink-400 ring-1 ring-inset ring-hairline",
                      day.state === "today" && "bg-canvas text-ink ring-2 ring-turquoise-700",
                    )}
                  >
                    {day.day}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p key={picked} aria-live="polite" className="onb-rise mt-3 min-h-[44px] px-2 text-[14px] leading-snug text-ink-600">
            {DAY_MEANING[DEMO_WEEK[picked].state]}
          </p>
        </div>
      </Rise>

      <Rise i={3} className="mt-2">
        <div className="flex items-center justify-between rounded-group bg-surface px-4 py-3">
          <div>
            <p className="text-[15px] font-semibold text-ink">Meditace</p>
            <p className="text-[13px] tabular-nums text-ink-500">
              Celkem {Math.floor(minutes / 60)} h {minutes % 60} min
            </p>
          </div>
          <p className="font-display text-[22px] font-bold tabular-nums text-ink">
            92<span className="ml-0.5 text-[13px] text-ink-500">%</span>
          </p>
        </div>
      </Rise>
    </div>
  );
}

/**
 * Číslo, které při zobrazení naběhne od nuly. Kdo má omezené animace,
 * dostane rovnou výsledek.
 */
function useCountUp(target: number, duration = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const frame = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(frame);
    }

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Zpomalení ke konci, ať číslo „dosedne".
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

// ─── 4. Vize ──────────────────────────────────────────────────────────────

export function VisionSlide() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <SlideHeading title="Kam jdeš a proč">
        Napíšeš si svoji vizi. Každý den ji uvidíš pod návyky — ve chvílích,
        kdy se nechce, ti připomene, proč to děláš.
      </SlideHeading>

      <Rise i={2} className="mt-7">
        <TryHint>Klepni na ni</TryHint>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 rounded-group bg-sun-surface px-4 py-3.5 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/55">
              Připomeň si vizi a důvod proč
            </span>
            <span className={cn("mt-1.5 font-display text-[17px] font-semibold leading-snug text-ink", open ? "block" : "line-clamp-2")}>
              Za devadesát dní chci být člověk, kterému ráno nemusí nikdo
              připomínat, co má udělat. Ne kvůli výkonu — kvůli tomu, abych si
              zase věřil, že když si něco řeknu, tak to platí.
            </span>
          </span>
          <svg viewBox="0 0 24 24" aria-hidden className={cn("mt-1 h-5 w-5 shrink-0 text-ink/45 transition-transform duration-200", open && "rotate-180")} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </Rise>

      <Rise i={3}>
        <p className="mt-3 px-1 text-[14px] leading-snug text-ink-500">
          Svoji si napíšeš za chvíli. Pomůžu ti třemi otázkami.
        </p>
      </Rise>
    </div>
  );
}

// ─── 5. Sezení ────────────────────────────────────────────────────────────

export function SessionsSlide() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <SlideHeading title="Po každém setkání zápis">
        Napíšu ti, co jsme probrali a co tě do příště čeká. A ty mi tu
        necháš zpětnou vazbu — jak se po sezení cítíš a co sis odnesl/a.
      </SlideHeading>

      <Rise i={2} className="mt-7">
        <TryHint>Otevři zápis</TryHint>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="w-full rounded-group border border-hairline bg-surface px-4 py-3.5 text-left"
        >
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-display text-[17px] font-bold text-ink">
              18. září
            </span>
            <span className="rounded-full bg-sun-surface px-2 py-0.5 text-[11px] font-semibold text-ink">
              Čeká na tebe
            </span>
          </span>
          <span className="mt-0.5 block text-[13px] text-ink-500">Koučink · pátek</span>
          <span className={cn("mt-1.5 text-[15px] leading-snug text-ink-600", open ? "block" : "line-clamp-2")}>
            Řešili jsme, proč ti večer padá disciplína. Problém není vůle, ale
            to, že si den nenaplánuješ dopředu.
          </span>

          {open && (
            <span className="onb-rise mt-3 block rounded-card bg-sun-surface px-3 py-2.5">
              <span className="block font-display text-[15px] font-bold text-ink">
                Úkoly do příště
              </span>
              <span className="mt-1 block text-[14px] leading-snug text-ink">
                Večer si připrav ráno. Stačí tři řádky na papír.
              </span>
            </span>
          )}
        </button>
      </Rise>
    </div>
  );
}
