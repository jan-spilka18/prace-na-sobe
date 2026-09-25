"use client";

import { cn } from "@/lib/cn";

/**
 * Prvek, který na slidu naskočí se zpožděním podle pořadí.
 * `i` je pořadí shora; každý další naskočí o 70 ms později.
 */
export function Rise({
  i,
  className,
  children,
}: {
  i: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("onb-rise", className)}
      style={{ "--onb-delay": `${i * 70}ms` } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/**
 * Nadpis a text slidu.
 *
 * Text pod nadpisem je stejným písmem jako nadpis, jen tenčím řezem, a
 * skoro černý. 17 px, ne víc: Montserrat je široký a ve větší velikosti
 * by odstavec působil hlučně. Šedý odstavec systémovým písmem pod výrazným titulkem je vzorec
 * z každé druhé šablony — a šedá navíc říká „tohle nemusíš číst", což
 * u věty, která vysvětluje celý slide, neplatí.
 */
export function SlideHeading({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <>
      <Rise i={0}>
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-tight text-ink text-balance">
          {title}
        </h1>
      </Rise>
      {children && (
        <Rise i={1}>
          <p className="mt-3.5 font-display text-[17px] font-normal leading-[1.55] text-ink/75 text-pretty">
            {children}
          </p>
        </Rise>
      )}
    </>
  );
}

/**
 * Zvýraznění klíčové fráze — jako žlutým zvýrazňovačem v sešitě.
 *
 * Jedno na slide, víc ne: když je zvýrazněné všechno, není nic. Barva je
 * žlutá značky; v tmavém režimu tlumená, stejně jako vize.
 * box-decoration-clone drží podtržení na každém řádku, když se fráze zalomí.
 */
export function Mark({ children }: { children: React.ReactNode }) {
  return (
    <mark className="box-decoration-clone bg-transparent bg-[linear-gradient(transparent_56%,var(--color-sun-surface)_56%)] px-0.5 text-ink [-webkit-box-decoration-break:clone] -mx-0.5">
      {children}
    </mark>
  );
}

/**
 * Štítek nad ukázkou. Bez něj by člověk nepoznal, že ukázka není obrázek
 * a dá se na ni klepnout.
 */
export function TryHint({ children = "Zkus si to" }: { children?: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-turquoise-700">
      <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11V5.5a1.5 1.5 0 013 0V10m0-1.5a1.5 1.5 0 013 0V11m0-1a1.5 1.5 0 013 0v4.5a6 6 0 01-6 6h-.6a6 6 0 01-4.9-2.6L4.2 14a1.5 1.5 0 012.4-1.8L9 14.5" />
      </svg>
      {children}
    </p>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="min-h-[52px] w-full rounded-card bg-turquoise text-[17px] font-semibold text-white transition-[transform,opacity] duration-100 active:scale-[0.98] active:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  );
}
