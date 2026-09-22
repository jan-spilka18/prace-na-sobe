"use client";

import { cn } from "@/lib/cn";
import { EVERY_DAY, WEEKDAY_SHORT, WORKDAYS } from "@/lib/habits";

const PRESETS: Array<{ label: string; days: number[] }> = [
  { label: "Každý den", days: EVERY_DAY },
  { label: "Po–Pá", days: WORKDAYS },
];

/**
 * Výběr dnů, kdy návyk platí.
 *
 * Nahoře dvě předvolby, protože „každý den" a „pracovní dny" pokryjí skoro
 * všechno. Jednotlivé dny pod tím jsou pro zbytek.
 */
export function WeekdayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  function toggle(day: number) {
    const next = value.includes(day)
      ? value.filter((selected) => selected !== day)
      : [...value, day].sort((a, b) => a - b);

    // Návyk bez jediného dne by nešel nikdy splnit. Poslední den
    // proto odebrat nejde.
    if (next.length === 0) return;
    onChange(next);
  }

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2">
        {PRESETS.map((preset) => {
          const active = sameDays(value, preset.days);
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.days)}
              aria-pressed={active}
              className={cn(
                "min-h-[36px] rounded-full px-3.5 text-[14px] font-semibold transition-colors",
                active
                  ? "bg-turquoise text-white"
                  : "bg-canvas text-ink-600 active:bg-hairline",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        {WEEKDAY_SHORT.map((label, index) => {
          const day = index + 1;
          const selected = value.includes(day);

          return (
            <button
              key={label}
              type="button"
              onClick={() => toggle(day)}
              aria-pressed={selected}
              aria-label={label}
              // Stejná barva jako předvolba nad tím — dvě různé „vybráno"
              // v jednom ovladači se pletou.
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-[0.7rem]",
                "text-[14px] font-semibold transition-colors",
                selected
                  ? "bg-turquoise text-white"
                  : "bg-canvas text-ink-500 active:bg-hairline",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function sameDays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = [...a].sort((x, y) => x - y);
  return sorted.every((value, index) => value === b[index]);
}
