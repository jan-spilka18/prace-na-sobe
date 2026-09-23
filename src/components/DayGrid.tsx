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
  // Volno je bez výplně — ať je vidět, že tam nic nebylo, ne že se něco
  // nestihlo. Jinak by splynulo s nevyplněným dnem.
  rest: "text-ink-400",
};

/**
 * Průběh programu po dnech.
 *
 * Mřížka se zarovnává na dny v týdnu, takže si člověk všimne, že mu pravidelně
 * vypadávají třeba víkendy. Prostá řada devadesáti čtverců to neukáže.
 */
export function DayGrid({
  days,
  today,
  title,
  range,
  hrefFor,
}: {
  days: GridDay[];
  today?: string;
  title?: string;
  range?: string;
  hrefFor?: (date: string) => string;
}) {
  if (days.length === 0) return null;

  const leadingBlanks = weekdayIndex(days[0].date);

  return (
    <div className="space-y-3">
      <div className="rounded-group bg-surface p-4">
        {(title || range) && (
          <div className="mb-3 flex items-baseline justify-between gap-3">
            {title && (
              <h2 className="truncate font-display text-[17px] font-bold text-ink">
                {title}
              </h2>
            )}
            {range && (
              <span className="shrink-0 text-[12px] tabular-nums text-ink-500">
                {range}
              </span>
            )}
          </div>
        )}

        {/*
          Devadesát dní se má číst jako jeden blok, ne jako tabulka přes
          celou obrazovku. Roztažené čtverce vypadaly jako kalendář na zeď
          a většinu karty zabíraly prázdné budoucí dny. Menší buňka drží
          celý program v jednom pohledu; 32 px pořád jde trefit prstem.
        */}
        <div className="mx-auto grid max-w-[16rem] grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-400"
            >
              {day}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }, (_, index) => (
            <div key={`blank-${index}`} aria-hidden />
          ))}

          {days.map((day) => (
            <Cell
              key={day.date}
              day={day}
              isToday={day.date === today}
              hrefFor={hrefFor}
            />
          ))}
        </div>
      </div>

      <Legend days={days} />
    </div>
  );
}

function Cell({
  day,
  isToday,
  hrefFor,
}: {
  day: GridDay;
  isToday?: boolean;
  hrefFor?: (date: string) => string;
}) {
  const label = `Den ${day.dayNumber}, ${formatCzechDate(day.date)} — ${
    day.isFuture ? "zatím nebyl" : DAY_STATUS_LABELS[day.status]
  }${isToday ? " (dnes)" : ""}`;

  const className = cn(
    "flex aspect-square items-center justify-center rounded-[0.35rem] text-[10px] font-semibold tabular-nums",
    day.isFuture ? "bg-canvas/60 text-ink-400" : CELL[day.status],
    // Dnešek se obtáhne, ne vybarví — jinak by se pletl se stavem dne.
    isToday && "ring-2 ring-turquoise ring-offset-1 ring-offset-surface",
  );

  // Devadesát čísel pod sebou je šum. Číslo si nechají jen dny, které se
  // počítají; volno dostane čárku a budoucnost tečku, aby bylo na první
  // pohled vidět, kde program teprve začne.
  const content = day.isFuture ? (
    <span aria-hidden className="h-1 w-1 rounded-full bg-current opacity-70" />
  ) : day.status === "rest" ? (
    <span aria-hidden className="h-px w-2.5 rounded-full bg-current" />
  ) : (
    <span aria-hidden>{day.dayNumber}</span>
  );

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
    rest: past.filter((day) => day.status === "rest").length,
  };

  // Volno se v legendě objeví, jen když nějaké je — u každodenních návyků
  // by to byla položka, která vždycky ukazuje nulu.
  const shown = (["complete", "incomplete", "empty", "rest"] as const).filter(
    (status) => status !== "rest" || counts.rest > 0,
  );

  return (
    <div className="space-y-2">
      <dl className="flex flex-wrap gap-x-4 gap-y-2 px-1">
        {shown.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "flex h-3.5 w-3.5 items-center justify-center rounded-[0.25rem]",
                status === "complete" && "bg-turquoise",
                status === "incomplete" && "bg-ink",
                status === "empty" && "bg-canvas ring-1 ring-inset ring-hairline",
              )}
            >
              {status === "rest" && (
                <span className="h-px w-2.5 rounded-full bg-ink-400" />
              )}
            </span>
            <dt className="text-[12px] text-ink-600">
              {DAY_STATUS_LABELS[status]}
            </dt>
            <dd className="text-[12px] font-semibold tabular-nums text-ink">
              {counts[status]}
            </dd>
          </div>
        ))}
      </dl>

      {/*
        Bez téhle věty vypadá volno jako propadlý den. Píše se jen tam,
        kde nějaké volno je — jinak by odpovídala na otázku, která nevznikla.
      */}
      <p className="px-1 text-[12px] leading-relaxed text-ink-500">
        Rámeček = dnes · tečka = budoucí den
        {counts.rest > 0 && (
          <>
            <br />
            Volno se do úspěšnosti nepočítá.
          </>
        )}
      </p>
    </div>
  );
}
