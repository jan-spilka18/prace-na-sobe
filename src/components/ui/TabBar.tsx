"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: React.ReactNode };

const TABS: Tab[] = [
  {
    href: "/",
    label: "Dnes",
    icon: (
      <path d="M4 12.5l5 5 11-11" />
    ),
  },
  {
    href: "/prehled",
    label: "Přehled",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  {
    href: "/sezeni",
    label: "Sezení",
    icon: (
      <>
        <path d="M4 5.5A1.5 1.5 0 015.5 4h13A1.5 1.5 0 0120 5.5v9A1.5 1.5 0 0118.5 16H9l-5 4z" />
      </>
    ),
  },
  {
    href: "/navyky",
    label: "Návyky",
    icon: (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </>
    ),
  },
];

export function TabBar({
  badges = {},
}: {
  /** Počet čekajících věcí podle adresy záložky, např. { "/sezeni": 2 }. */
  badges?: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-hairline bg-surface/95 pb-safe backdrop-blur-xl">
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const badge = badges[tab.href] ?? 0;

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                // Záložky se načtou celé dopředu, takže přepnutí je okamžité.
                prefetch={true}
                aria-current={active ? "page" : undefined}
                aria-label={
                  badge > 0 ? `${tab.label}, ${waitingLabel(badge)}` : undefined
                }
                className={cn(
                  // Stisk je vidět okamžitě, ještě než se obrazovka načte —
                  // jinak klepnutí působí, jako by se nic nestalo.
                  "flex min-h-[49px] flex-col items-center justify-center gap-1 py-1.5",
                  "transition-[opacity,transform] duration-100 active:scale-95 active:opacity-60",
                  active ? "text-turquoise-700" : "text-ink-500",
                )}
              >
                <span className="relative">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 2.4 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {tab.icon}
                  </svg>
                  {badge > 0 && <Badge count={badge} />}
                </span>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Červené kolečko s počtem v rohu ikony.
 *
 * Červená, ne barva značky: tyrkysová i žlutá v aplikaci znamenají „hotovo"
 * nebo „vize", kdežto červený odznak každý zná z telefonu jako „něco na tebe
 * čeká". Tichý pulz kolem něj připomíná, že to pořád visí; kdo má v telefonu
 * omezený pohyb, uvidí jen klidné kolečko.
 */
function Badge({ count }: { count: number }) {
  return (
    <span aria-hidden className="absolute -right-2.5 -top-1.5 flex">
      <span className="absolute inset-0 rounded-full bg-badge motion-safe:animate-badge-pulse" />
      <span className="relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-badge px-1 text-[11px] font-bold leading-none tabular-nums text-white ring-2 ring-surface">
        {count > 9 ? "9+" : count}
      </span>
    </span>
  );
}

function waitingLabel(count: number): string {
  if (count === 1) return "1 sezení čeká na tvoji zpětnou vazbu";
  if (count < 5) return `${count} sezení čekají na tvoji zpětnou vazbu`;
  return `${count} sezení čeká na tvoji zpětnou vazbu`;
}
