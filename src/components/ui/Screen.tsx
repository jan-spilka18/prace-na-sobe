import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Obrazovka s hlavičkou ve stylu iOS: malý titulek v liště nahoře
 * a velký titulek v obsahu pod ní.
 */
export function Screen({
  title,
  subtitle,
  back,
  action,
  children,
  className,
}: {
  title: string;
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
      {/*
        Lišta je poloprůhledná jako na iOS, ale málo krycí barva nechá
        prosvítat text pod ní a hlavička se stane nečitelnou. Rozostření
        samo nestačí — na to je potřeba krytí.
      */}
      <header className="sticky top-0 z-20 border-b border-hairline bg-surface/95 pt-safe backdrop-blur-xl">
        <div className="mx-auto flex h-11 w-full max-w-2xl items-center gap-2 px-4">
          <div className="min-w-0 flex-1">
            {back && (
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
            )}
          </div>
          {action}
        </div>
      </header>

      <main
        className={cn(
          // Spodní odsazení musí přesáhnout spodní lištu, jinak se poslední
          // karta nedá doscrollovat zpod ní.
          "mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-4",
          className,
        )}
      >
        <div className="mb-5">
          <h1 className="text-[34px] font-bold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[15px] text-ink-600">{subtitle}</p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
