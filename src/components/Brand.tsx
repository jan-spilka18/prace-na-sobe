import { cn } from "@/lib/cn";

/*
  Značka Honzy Spilky v aplikaci. Soubory jsou křivky z balíčku log —
  logo se nikdy nepíše jako text jiným písmem a nepřebarvuje se.

  Wordmark „honzaspilka." tam, kde je místo na šířku (přihlášení,
  hlavička, patička). Miniatura „hs." tam, kde je místo čtvercové.
  Nikdy obě vedle sebe.
*/

/** Wordmark. Výšku určuje className (v aplikaci 20–24 px). */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span role="img" aria-label="Honza Spilka" className="inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-na-svetle.svg"
        alt=""
        className={cn("brand-on-light h-6 w-auto", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-na-tmave.svg"
        alt=""
        className={cn("brand-on-dark h-6 w-auto", className)}
      />
    </span>
  );
}

/** Miniatura „hs." na tmavé dlaždici. Funguje na světlém i tmavém pozadí. */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/ikona-tmava.svg"
      alt="Honza Spilka"
      className={cn("h-10 w-10", className)}
    />
  );
}
