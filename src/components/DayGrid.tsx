import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatCzechDate, weekdayIndex } from "@/lib/date";
import { DAY_STATUS_LABELS } from "@/lib/habits";
import type { GridDay } from "@/lib/queries";

const WEEKDAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

const CELL: Record<GridDay["status"], string> = {
  complete: "bg-turquoise text-white",
  incomplete: "bg-ink text-white",
  empty: "bg-canvas text-ink-500",
};

/**
 * Průběh programu po dnech.
 *
 * Mřížka se zarovnává na dny v týdnu, takže si člověk všimne, že mu pravidelně
 * vypadávají třeba víkendy. Prostá řada devadesáti čtverců to neukáže.
 */
export function DayGrid({
  days,
  hrefFor,
}: {
  days: GridDay[];
  hrefFor?: (date: string) => string;
}) {
  if (days.length === 0) return null;

  const leadingBlanks = weekdayIndex(days[0].date);

  return (
    <div className="space-y-3">
      <div className="rounded-group bg-surface p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[11px] font-semibold text-ink-500"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }, (_, index) => (
            <div key={`blank-${index}`} aria-hidden />
          ))}

          {days.map((day) => (
            <Cell key={day.date} day={day} hrefFor={hrefFor} />
          ))}
        </div>
      </div>

      <Legend days={days} />
    </div>
  );
}

function Cell({
  day,
  hrefFor,
}: {
  day: GridDay;
  hrefFor?: (date: string) => string;
}) {
  const label = `Den ${day.dayNumber}, ${formatCzechDate(day.date)} — ${
    day.isFuture ? "zatím nebyl" : DAY_STATUS_LABELS[day.status]
  }`;

  const className = cn(
    "flex aspect-square items-center justify-center rounded-[0.5rem] text-[12px] font-semibold tabular-nums",
    day.isFuture ? "bg-canvas/60 text-ink-400" : CELL[day.status],
  );

  const content = <span aria-hidden>{day.dayNumber}</span>;

  if (day.isFuture || !hrefFor) {
    return (
      <div className={className} title={label}>
        <span className="sr-only">{label}</span>
        {content}
      </div>
    );
  }

  return (
    <Link href={hrefFor(day.date)} className={className} title={label}>
      <span className="sr-only">{label}</span>
      {content}
    </Link>
  );
}

function Legend({ days }: { days: GridDay[] }) {
  const past = days.filter((day) => !day.isFuture);
  const counts = {
    complete: past.filter((day) => day.status === "complete").length,
    incomplete: past.filter((day) => day.status === "incomplete").length,
    empty: past.filter((day) => day.status === "empty").length,
  };

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-2 px-1">
      {(["complete", "incomplete", "empty"] as const).map((status) => (
        <div key={status} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 rounded-[0.25rem]",
              status === "complete" && "bg-turquoise",
              status === "incomplete" && "bg-ink",
              status === "empty" && "bg-canvas ring-1 ring-inset ring-hairline",
            )}
          />
          <dt className="text-[13px] text-ink-600">
            {DAY_STATUS_LABELS[status]}
          </dt>
          <dd className="text-[13px] font-semibold tabular-nums text-ink">
            {counts[status]}
          </dd>
        </div>
      ))}
    </dl>
  );
}
