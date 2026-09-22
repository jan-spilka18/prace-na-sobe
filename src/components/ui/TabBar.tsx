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
    href: "/navyky",
    label: "Návyky",
    icon: (
      <>
        <path d="M4 6h16M4 12h16M4 18h10" />
      </>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-30 border-t border-hairline bg-surface/95 pb-safe backdrop-blur-xl">
      <ul className="mx-auto flex w-full max-w-2xl">
        {TABS.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);

          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[49px] flex-col items-center justify-center gap-1 py-1.5",
                  active ? "text-turquoise-700" : "text-ink-500",
                )}
              >
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
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
