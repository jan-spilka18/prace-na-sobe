import { cn } from "@/lib/cn";

/**
 * Značka aplikace: miniatura „hs." na tmavé dlaždici.
 *
 * Jediná podoba značky, která se v aplikaci používá — wordmark se jménem
 * Honza nechce. Soubor je křivka z balíčku log, nepřebarvuje se. Tmavá
 * dlaždice funguje na světlém i tmavém pozadí, takže stačí jedna verze.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/ikona-tmava.svg"
      alt="Higher Self"
      className={cn("h-10 w-10", className)}
    />
  );
}
