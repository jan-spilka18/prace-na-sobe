import { cn } from "@/lib/cn";

/**
 * Značka aplikace — tři stoupající kroky.
 *
 * Stejná kresba jako ikona na ploše (`src/app/icon.svg`). Když ji klient
 * uvidí na přihlášení i pod prstem na ploše, spojí si je.
 */
export function AppMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label="Práce na sobě"
      className={cn("h-16 w-16", className)}
    >
      <rect width="160" height="160" rx="36" fill="#171717" />
      <rect x="34" y="92" width="24" height="38" rx="8" fill="#5FC3CE" opacity=".55" />
      <rect x="68" y="70" width="24" height="60" rx="8" fill="#5FC3CE" />
      <rect x="102" y="40" width="24" height="90" rx="8" fill="#FFF0A6" />
    </svg>
  );
}
