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

/** Nadpis a text slidu. Stejný rytmus na každém, ať se neskáče. */
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
        <h1 className="font-display text-[30px] font-bold leading-[1.1] tracking-tight text-ink text-balance">
          {title}
        </h1>
      </Rise>
      {children && (
        <Rise i={1}>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-600">
            {children}
          </p>
        </Rise>
      )}
    </>
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
