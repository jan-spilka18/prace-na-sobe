"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type Tab = { href: string; label: string; icon: React.ReactNode };

/*
  Ikony říkají, co sekce dělá: slunce = tenhle den, rostoucí sloupce =
  jak mi to jde, bublina s tečkami = rozhovor s Honzou, šipky dokola =
  co opakuju. Dřív tu byla fajfka, mřížka a čáry, které nic neříkaly.
*/
const TABS: Tab[] = [
  {
    href: "/",
    label: "Dnes",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    href: "/prehled",
    label: "Přehled",
    icon: <path d="M3 20h18M6 16v-3M11 16V9M16 16V5" />,
  },
  {
    href: "/sezeni",
    label: "Sezení",
    icon: (
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 20l1.1-4.3A8.4 8.4 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5zM8 11.5h.01M12 11.5h.01M16 11.5h.01" />
    ),
  },
  {
    href: "/navyky",
    label: "Návyky",
    icon: (
      <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
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
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 py-1.5",
                  "transition-[opacity,transform] duration-100 active:scale-95 active:opacity-60",
                  active ? "text-turquoise-700" : "text-ink-500",
                )}
              >
                {/* Aktivní ikona sedí v tyrkysové kapsli — vidět i periferně. */}
                <span
                  className={cn(
                    "relative flex h-[30px] w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-turquoise-100",
                  )}
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="h-[22px] w-[22px]"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={active ? 2.3 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {tab.icon}
                  </svg>
                  {badge > 0 && <Badge count={badge} />}
                </span>
                <span
                  className={cn(
                    "text-[11px]",
                    active ? "font-extrabold" : "font-medium",
                  )}
                >
                  {tab.label}
                </span>
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
    <span aria-hidden className="absolute -top-1.5 right-1 flex">
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
