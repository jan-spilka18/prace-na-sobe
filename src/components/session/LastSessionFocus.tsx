import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { parseTasks, refineTasks } from "@/lib/sessionTasks";

/**
 * Fokus z posledního sezení na denní obrazovce.
 *
 * Propojuje každodenní odškrtávání se sezením: klient vidí, na co se má
 * do příště soustředit a kolik úkolů na něm leží, aniž by musel otevírat
 * zápis. Bez fokusu i bez úkolů se nezobrazí vůbec.
 */
export function LastSessionFocus({
  sessionId,
  content,
}: {
  sessionId: string;
  content: Record<string, string>;
}) {
  const refined = refineTasks(content);
  const focus = (refined.focus ?? "").trim();
  const tasks = parseTasks(refined.tasks ?? "").filter(
    (task) => task.whoKind !== "coach",
  ).length;

  if (focus === "" && tasks === 0) return null;

  return (
    <Link
      href={`/sezeni/${sessionId}`}
      className="block space-y-2.5 rounded-[24px] bg-turquoise px-5 py-5 text-on-sun transition-opacity active:opacity-80"
    >
      <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em]">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        </svg>
        {focus ? "Tvůj fokus z posledního sezení" : "Z posledního sezení"}
      </span>

      {focus && (
        <Markdown
          source={focus}
          tone="accent"
          size="xl"
          className="font-display font-bold"
        />
      )}

      <span className="flex flex-wrap gap-1.5 pt-0.5">
        {tasks > 0 && (
          // Štítky na plné tyrkysové jsou světlé v obou režimech — tmavý
          // podklad by s tmavým písmem karty splynul.
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[13px] font-bold">
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-on-sun text-[11px] font-extrabold text-sun">
              {tasks}
            </span>
            {tasks === 1 ? "úkol do příště" : tasks < 5 ? "úkoly do příště" : "úkolů do příště"}
          </span>
        )}
        <span className="inline-flex items-center rounded-full bg-white/50 px-3 py-1.5 text-[13px] font-bold">
          Otevřít zápis →
        </span>
      </span>
    </Link>
  );
}
