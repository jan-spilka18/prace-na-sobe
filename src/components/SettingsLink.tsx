import Link from "next/link";

/**
 * Ozubené kolo v liště. Odhlášení se přestěhovalo do nastavení — klient ho
 * potřebuje jednou za rok, a v hlavičce denní obrazovky zabíralo místo
 * tlačítku, které nikdy nechtěl zmáčknout.
 *
 * Tečka znamená, že v nastavení něco čeká. Zatím jediný důvod je heslo
 * od Honzy.
 */
export function SettingsLink({ alert = false }: { alert?: boolean }) {
  return (
    <Link
      href="/nastaveni"
      aria-label={alert ? "Nastavení (něco čeká)" : "Nastavení"}
      className="relative -mr-2 flex h-11 w-11 items-center justify-center text-turquoise-700 active:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 14.5a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5v.2a2 2 0 11-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1h.2a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z" />
      </svg>

      {alert && (
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-sun ring-2 ring-surface"
        />
      )}
    </Link>
  );
}
