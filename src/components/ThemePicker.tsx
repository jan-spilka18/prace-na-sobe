"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { THEMES, THEME_COOKIE, type Theme } from "@/lib/theme";

/**
 * Přepínač vzhledu.
 *
 * Změna se projeví v tu chvíli, kdy člověk klepne: atribut na <html> se
 * přepíše rovnou v prohlížeči a cookie se zapíše bez cesty na server.
 * Server ji přečte až při dalším načtení stránky.
 */
export function ThemePicker({ initial }: { initial: Theme }) {
  const [theme, setTheme] = useState<Theme>(initial);

  function choose(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <section className="space-y-2">
      <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
        Vzhled
      </h2>

      <div
        role="radiogroup"
        aria-label="Vzhled aplikace"
        className="grid grid-cols-3 gap-1 rounded-group bg-surface p-1"
      >
        {THEMES.map((option) => {
          const selected = option.value === theme;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(option.value)}
              className={cn(
                "min-h-[44px] rounded-card px-2 text-[14px] font-semibold transition-colors duration-150",
                selected
                  ? "bg-ink text-on-ink"
                  : "text-ink-600 active:bg-canvas",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="px-4 text-[13px] leading-snug text-ink-500">
        Platí jen pro tohle zařízení.
      </p>
    </section>
  );
}

/** Zápis do stránky a cookie. Mimo komponentu, protože sahá na globální stav. */
function applyTheme(next: Theme) {
  const root = document.documentElement;
  if (next === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);

  // Rok platnosti; SameSite=Lax stačí, cookie nenese nic citlivého.
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
}
