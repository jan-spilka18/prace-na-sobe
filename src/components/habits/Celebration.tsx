"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Celebrate = (streak: number) => void;

const CelebrationContext = createContext<Celebrate>(() => {});

export function useCelebration(): Celebrate {
  return useContext(CelebrationContext);
}

/**
 * Gratulace po uzavření dne.
 *
 * Vyskočí jen ve chvíli, kdy den splněním posledního návyku přejde do
 * hotového stavu — ne při každém načtení hotového dne. Kdyby se ukazovala
 * pokaždé, přestane to po týdnu cokoli znamenat.
 */
export function CelebrationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [streak, setStreak] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  const celebrate = useCallback<Celebrate>((value) => {
    setStreak(value);
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      {streak !== null && (
        <Toast
          streak={streak}
          visible={visible}
          onDismiss={() => setVisible(false)}
        />
      )}
    </CelebrationContext.Provider>
  );
}

function Toast({
  streak,
  visible,
  onDismiss,
}: {
  streak: number;
  visible: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      // Sedí nad spodní lištou, ne uprostřed obrazovky — gratulace nemá
      // přerušit to, co klient zrovna dělá.
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[68px] z-40 flex justify-center px-4",
        "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
      )}
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-sheet",
          "bg-night px-4 py-3 text-left text-white shadow-lg",
        )}
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-turquoise"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12.5l5 5 11-11" />
          </svg>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">
            Den máš hotový
          </span>
          <span className="block text-[14px] text-white/75">
            {streakLabel(streak)}
          </span>
        </span>
      </button>
    </div>
  );
}

function streakLabel(streak: number): string {
  if (streak <= 1) return "Začátek série. Zítra na ni navážeš.";
  if (streak < 5) return `${streak} dny v řadě`;
  return `${streak} dní v řadě`;
}
