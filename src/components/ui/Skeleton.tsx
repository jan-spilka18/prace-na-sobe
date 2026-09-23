import { cn } from "@/lib/cn";

/**
 * Kostra obsahu, dokud se nenačte.
 *
 * Tvary kopírují skutečnou obrazovku, aby po načtení nic neposkočilo.
 * Pulzování se vypne, když má člověk v telefonu omezené animace.
 */
export function Bone({ className }: { className?: string }) {
  // <span>, ne <div>: kost se vkládá i do titulku a podtitulku, což jsou
  // <h1> a <p>, a blokový prvek uvnitř nich je neplatné HTML.
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-card bg-hairline motion-safe:animate-pulse",
        className,
      )}
    />
  );
}

/** Oznámí čtečce, že se načítá, jednou za obrazovku — ne u každé kosti. */
export function LoadingLabel() {
  return (
    <span role="status" className="sr-only">
      Načítám…
    </span>
  );
}
