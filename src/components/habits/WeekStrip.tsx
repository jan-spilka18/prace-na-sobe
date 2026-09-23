import Link from "next/link";
import { cn } from "@/lib/cn";
import { addDays, formatCzechDate, weekdayIndex } from "@/lib/date";
import { DAY_STATUS_LABELS, WEEKDAY_SHORT } from "@/lib/habits";
import type { GridDay } from "@/lib/queries";

/**
 * Týden nad denní obrazovkou.
 *
 * Nahradil dvojici šipek. Šipka neřekne, kam vede — člověk klepne a teprve
 * pak zjistí, kde skončil. Sedm koleček s datem říká rovnou, který den si
 * otevře, a zároveň jedním pohledem ukáže, jak celý týden dopadl.
 */
export function WeekStrip({
  days,
  selected,
  today,
  hrefFor,
}: {
  days: GridDay[];
  selected: string;
  today: string;
  hrefFor: (date: string) => string;
}) {
  // Pondělí týdne, do kterého vybraný den spadá. Pevné okno Po–Ne se drží
  // stejného rastru jako mřížka v Přehledu, takže si je člověk spojí.
  const monday = addDays(selected, -weekdayIndex(selected));
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));

  const byDate = new Map(days.map((day) => [day.date, day]));

  return (
    <nav aria-label="Dny v týdnu">
      <ol className="flex items-start justify-between gap-1">
        {week.map((date) => (
          <Day
            key={date}
            date={date}
            day={byDate.get(date)}
            isSelected={date === selected}
            isToday={date === today}
            hrefFor={hrefFor}
          />
        ))}
      </ol>
    </nav>
  );
}

function Day({
  date,
  day,
  isSelected,
  isToday,
  hrefFor,
}: {
  date: string;
  day?: GridDay;
  isSelected: boolean;
  isToday: boolean;
  hrefFor: (date: string) => string;
}) {
  const dayOfMonth = Number(date.slice(8, 10));
  const weekday = WEEKDAY_SHORT[weekdayIndex(date)];

  // Mimo program se den neotevírá a budoucnost se nedá vyplnit dopředu.
  const openable = Boolean(day) && !day!.isFuture;

  const circle = cn(
    "flex h-10 w-10 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition-colors",
    // Mimo program: jen číslo, žádné kolečko. Ten den k výzvě nepatří.
    !day && "text-ink-400/60",
    // Budoucnost musí mít kolečko vidět, jinak vypadá jako holé číslo.
    // bg-canvas je přesně barva pozadí stránky, takže by zmizelo.
    day?.isFuture && "bg-hairline text-ink-500",
    day &&
      !day.isFuture &&
      {
        complete: "bg-turquoise text-white",
        incomplete: "bg-ink text-white",
        empty: "bg-canvas text-ink-600 ring-1 ring-inset ring-hairline",
        rest: "text-ink-400 ring-1 ring-inset ring-hairline",
      }[day.status],
    // Vybraný den se obtáhne, ne přebarví — jinak by se zvýraznění pralo
    // se stavem dne a nedalo by se přečíst obojí najednou.
    isSelected && "ring-2 ring-turquoise-700 ring-offset-2 ring-offset-canvas",
  );

  const label = day
    ? `${formatCzechDate(date)} — ${day.isFuture ? "zatím nebyl" : DAY_STATUS_LABELS[day.status]}`
    : `${formatCzechDate(date)} — mimo program`;

  const content = (
    <>
      <span
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          isSelected ? "text-turquoise-700" : "text-ink-400",
        )}
      >
        {weekday}
      </span>
      <span className={circle}>
        <span aria-hidden>{dayOfMonth}</span>
        <span className="sr-only">{label}</span>
      </span>
      {/* Tečka pod dneškem, ať se pozná i ve chvíli, kdy je vybraný jiný den. */}
      <span
        aria-hidden
        className={cn(
          "h-1 w-1 rounded-full",
          isToday ? "bg-turquoise-700" : "bg-transparent",
        )}
      />
    </>
  );

  const shell = "flex flex-1 flex-col items-center gap-1.5 py-1";

  if (!openable) {
    return (
      <li className={shell} aria-current={isSelected ? "date" : undefined}>
        {content}
      </li>
    );
  }

  return (
    <li className="flex flex-1">
      <Link
        href={hrefFor(date)}
        aria-current={isSelected ? "date" : undefined}
        className={cn(shell, "rounded-card active:opacity-60")}
      >
        {content}
      </Link>
    </li>
  );
}
