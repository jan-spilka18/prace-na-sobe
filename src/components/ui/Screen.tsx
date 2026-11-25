import Link from "next/link";
import { cn } from "@/lib/cn";
import { BrandMark } from "@/components/Brand";

/**
 * Obrazovka: malý štítek nad velkým nadpisem a obsah pod ním.
 *
 * Lišta nahoře je jen u podstránek, kde je potřeba cesta zpátky. Hlavní
 * obrazovky ji nemají — nadpis začíná rovnou nahoře a případné tlačítko
 * (nastavení) sedí vedle něj.
 */
export function Screen({
  eyebrow,
  title,
  subtitle,
  back,
  action,
  brand = false,
  children,
  className,
}: {
  /**
   * Doprovodný řádek pod nadpisem (datum, jméno klienta). Font manuál
   * nechce malé verzálkové nadtitulky, proto je pod nadpisem a běžným písmem.
   */
  eyebrow?: React.ReactNode;
  /** Miniatura „hs." nad nadpisem — jen na hlavních obrazovkách. */
  brand?: boolean;
  /** Text, nebo při načítání kostra místo něj. */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // flex-1 místo pevné výšky: obrazovka se roztáhne v layoutu,
    // takže pod ní může sedět spodní lišta.
    <div className="flex flex-1 flex-col bg-canvas">
      {back && (
        /*
          Lišta je poloprůhledná jako na iOS, ale málo krycí barva nechá
          prosvítat text pod ní a hlavička se stane nečitelnou. Rozostření
          samo nestačí — na to je potřeba krytí.
        */
        <header className="sticky top-0 z-20 border-b border-hairline bg-surface/95 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex h-11 w-full max-w-2xl items-center gap-2 px-4">
            <div className="min-w-0 flex-1">
              <Link
                href={back.href}
                className="-ml-1 inline-flex items-center gap-1 text-[17px] text-turquoise-700"
              >
                <svg
                  viewBox="0 0 8 14"
                  aria-hidden
                  className="h-4 w-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 1L1 7l6 6" />
                </svg>
                <span className="truncate">{back.label}</span>
              </Link>
            </div>
            {action}
          </div>
        </header>
      )}

      <main
        className={cn(
          // Spodní odsazení musí přesáhnout spodní lištu, jinak se poslední
          // karta nedá doscrollovat zpod ní.
          "mx-auto w-full max-w-2xl flex-1 px-4 pb-28",
          back ? "pt-5" : "pt-safe",
          className,
        )}
      >
        {brand && !back && (
          <div className="px-1 pt-4">
            <BrandMark className="h-9 w-9" />
          </div>
        )}
        <div className={cn("mb-6 flex items-end gap-3 px-1", !back && "pt-5")}>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[28px] font-bold leading-[1.15] text-ink">
              {title}
            </h1>
            {eyebrow && (
              <div className="mt-1 text-[14px] leading-snug text-ink-600">
                {eyebrow}
              </div>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[14px] leading-snug text-ink-600">{subtitle}</p>
            )}
          </div>
          {!back && action && <div className="shrink-0">{action}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
