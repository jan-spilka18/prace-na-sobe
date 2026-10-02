"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  addDays,
  formatCzechDate,
  formatCzechDayMonth,
  mondayOf,
  weekStarts,
  weekdayIndex,
} from "@/lib/date";
import { DAY_STATUS_LABELS, WEEKDAY_SHORT } from "@/lib/habits";
import type { GridDay } from "@/lib/queries";
import { liveDayStatus, useDayState } from "./DayState";

/** O kolik je potřeba táhnout, aby se týden přepnul (a víc než 18 % šířky ne). */
const SWIPE_DISTANCE = 56;
/** Rychlé švihnutí přepne i na kratší vzdálenost — px za milisekundu. */
const FLICK_SPEED = 0.35;

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  width: number;
  /** null = ještě se nerozhodlo, jestli jde o tah do strany, nebo o scroll. */
  horizontal: boolean | null;
};

/**
 * Týden nad denní obrazovkou.
 *
 * Nahradil dvojici šipek. Šipka neřekne, kam vede — člověk klepne a teprve
 * pak zjistí, kde skončil. Sedm koleček s datem říká rovnou, který den si
 * otevře, a zároveň jedním pohledem ukáže, jak celý týden dopadl.
 *
 * Tahem prstu do strany se listuje po celých týdnech programu, dozadu
 * i dopředu. Týdny jsou vedle sebe v jednom pásu, takže při tahu je vidět,
 * jak sousední týden přijíždí.
 */
export function WeekStrip({
  days,
  selected,
  today,
  hrefPrefix,
}: {
  days: GridDay[];
  selected: string;
  today: string;
  /** Začátek odkazu, za který se připojí datum. Funkci server předat neumí. */
  hrefPrefix: string;
}) {
  const live = useDayState();

  const byDate = new Map(days.map((day) => [day.date, day]));

  // Vybraný den bere stav z toho, co je právě odškrtnuté — kolečko v pásu
  // zezelená ve chvíli, kdy člověk odškrtne poslední návyk.
  const selectedDay = byDate.get(selected);
  if (live && selectedDay) {
    byDate.set(selected, {
      ...selectedDay,
      status: liveDayStatus(live.statuses, selectedDay.status),
    });
  }

  // Pevné okno Po–Ne se drží stejného rastru jako mřížka v Přehledu, takže
  // si je člověk spojí. Listovat jde přes celý program.
  const first = days[0]?.date ?? selected;
  const last = days.at(-1)?.date ?? selected;
  const weeks = weekStarts(
    first < selected ? first : selected,
    last > selected ? last : selected,
  );
  const home = Math.max(0, weeks.indexOf(mondayOf(selected)));

  // Při přechodu na jiný den se celý pás postaví znovu (klíč nad ním),
  // takže výchozí týden je vždycky ten s vybraným dnem.
  const [index, setIndex] = useState(home);
  // Posun prstem v pixelech; null = zrovna se netáhne a pás se může dojet animací.
  const [drag, setDrag] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const dragRef = useRef(0);
  const swiped = useRef(false);
  const wheelLockedUntil = useRef(0);

  const go = (target: number) =>
    setIndex(Math.min(weeks.length - 1, Math.max(0, target)));

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: event.timeStamp,
      width: event.currentTarget.clientWidth,
      horizontal: null,
    };
    swiped.current = false;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;

    const dx = event.clientX - g.startX;
    const dy = event.clientY - g.startY;

    if (g.horizontal === null) {
      // Pár pixelů chvění při klepnutí ještě není tah.
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      g.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!g.horizontal) {
        // Svislý pohyb patří scrollu stránky, do toho se nemícháme.
        gesture.current = null;
        return;
      }
      event.currentTarget.setPointerCapture(event.pointerId);
      swiped.current = true;
    }

    // Za prvním a posledním týdnem jde pás jen s odporem — je poznat,
    // že dál už nic není.
    const pastEdge =
      (dx > 0 && index === 0) || (dx < 0 && index === weeks.length - 1);
    dragRef.current = pastEdge ? dx / 3 : dx;
    setDrag(dragRef.current);
  }

  function onPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    gesture.current = null;

    if (g.horizontal && event.type === "pointerup") {
      const dx = dragRef.current;
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - g.startedAt);
      const far = Math.abs(dx) > Math.min(SWIPE_DISTANCE, g.width * 0.18);
      const flick = speed > FLICK_SPEED && Math.abs(dx) > 16;
      if (far || flick) go(dx < 0 ? index + 1 : index - 1);
    }

    dragRef.current = 0;
    setDrag(null);
  }

  // Tah, který skončil nad kolečkem, nesmí zároveň otevřít ten den.
  function onClickCapture(event: React.MouseEvent) {
    if (!swiped.current) return;
    swiped.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  // Touchpad na počítači posílá vodorovný scroll místo tahu.
  function onWheel(event: React.WheelEvent) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    if (Math.abs(event.deltaX) < 12) return;
    if (event.timeStamp < wheelLockedUntil.current) return;
    wheelLockedUntil.current = event.timeStamp + 450;
    go(event.deltaX > 0 ? index + 1 : index - 1);
  }

  const away = index !== home;
  const shownMonday = weeks[index] ?? mondayOf(selected);

  return (
    <nav aria-label="Dny v týdnu">
      {/*
        contain-inline-size: šířku určuje stránka, ne obsah. Bez toho by
        čtrnáct týdnů vedle sebe roztáhlo rodiče na šířku víc týdnů.
      */}
      <div
        className="w-full touch-pan-y select-none overflow-hidden contain-inline-size"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={onClickCapture}
        onWheel={onWheel}
        // Myší by se jinak odkaz začal přetahovat a gesto by se zrušilo.
        onDragStart={(event) => event.preventDefault()}
      >
        <div
          className={cn(
            "flex",
            drag === null && "transition-transform duration-300 ease-ios",
          )}
          style={{
            transform: `translateX(calc(${-index * 100}% + ${drag ?? 0}px))`,
          }}
        >
          {weeks.map((monday, weekIndex) => (
            <ol
              key={monday}
              // Týdny mimo obraz nejdou vybrat tabulátorem ani čtečkou.
              inert={weekIndex !== index}
              aria-hidden={weekIndex !== index}
              className="flex w-full shrink-0 items-start justify-between gap-1 px-1"
            >
              {Array.from({ length: 7 }, (_, offset) => {
                const date = addDays(monday, offset);
                return (
                  <Day
                    key={date}
                    date={date}
                    day={byDate.get(date)}
                    isSelected={date === selected}
                    isToday={date === today}
                    href={`${hrefPrefix}${date}`}
                  />
                );
              })}
            </ol>
          ))}
        </div>
      </div>

      <div className="sr-only">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>
          Předchozí týden
        </button>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === weeks.length - 1}
        >
          Další týden
        </button>
      </div>

      {away && (
        <div className="mt-1 flex items-center justify-between gap-3 px-1">
          <span className="text-[13px] font-medium text-ink-500" aria-live="polite">
            {weekRange(shownMonday)}
          </span>
          <button
            type="button"
            onClick={() => setIndex(home)}
            className="rounded-full bg-turquoise-50 px-3 py-1.5 text-[13px] font-semibold text-turquoise-700 transition-opacity active:opacity-60"
          >
            {selected === today ? "Zpět na dnešek" : "Zpět na vybraný den"}
          </button>
        </div>
      )}
    </nav>
  );
}

/** „28. září – 4. října", nebo „5.–11. října", když týden nepřekročí měsíc. */
function weekRange(monday: string): string {
  const sunday = addDays(monday, 6);
  if (monday.slice(5, 7) === sunday.slice(5, 7)) {
    return `${Number(monday.slice(8, 10))}.–${formatCzechDayMonth(sunday)}`;
  }
  return `${formatCzechDayMonth(monday)} – ${formatCzechDayMonth(sunday)}`;
}

function Day({
  date,
  day,
  isSelected,
  isToday,
  href,
}: {
  date: string;
  day?: GridDay;
  isSelected: boolean;
  isToday: boolean;
  href: string;
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
        incomplete: "bg-ink text-on-ink",
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
        href={href}
        aria-current={isSelected ? "date" : undefined}
        className={cn(shell, "rounded-card active:opacity-60")}
      >
        {content}
      </Link>
    </li>
  );
}
