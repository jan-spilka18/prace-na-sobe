import { cn } from "@/lib/cn";

/**
 * Obal pro věci, které klient nikdy neuvidí.
 *
 * Tmavý podklad je tady funkce, ne ozdoba. Příprava na sezení sedí na stejné
 * obrazovce jako zápis, který se publikuje — kdyby vypadaly stejně, dřív nebo
 * později se Honzovi splete, do kterého pole píše. Rozdíl musí být vidět
 * koutkem oka, ne po přečtení nadpisu.
 */
export function PrivateBlock({
  title,
  hint,
  action,
  className,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-group bg-ink p-4 text-white", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 font-display text-[17px] font-semibold">
            <LockIcon />
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-white/55">
            {hint ?? "Klient tohle nevidí."}
          </p>
        </div>
        {action}
      </div>

      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4 shrink-0 text-sun"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="10.5" width="16" height="10" rx="2.5" />
      <path d="M8 10.5V7a4 4 0 018 0v3.5" />
    </svg>
  );
}
