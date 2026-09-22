import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  dayStatus,
  formatActual,
  formatTarget,
  runningStreak,
  streakEndingAt,
  targetFor,
  wasActiveOn,
} from "./habits";
import type { Habit, HabitEntry, HabitTarget } from "./database.types";
import type { HabitForDay } from "./habits";

function target(
  habitId: string,
  value: number,
  from: string,
): HabitTarget {
  return {
    id: `${habitId}-${from}`,
    habit_id: habitId,
    target_value: value,
    effective_from: from,
    created_at: `${from}T00:00:00Z`,
  };
}

const TARGETS = [
  target("kliky", 50, "2026-01-01"),
  target("kliky", 80, "2026-02-01"),
  target("kliky", 100, "2026-03-01"),
  target("cteni", 20, "2026-01-15"),
];

describe("targetFor", () => {
  it("vrátí cíl platný v daný den", () => {
    assert.equal(targetFor(TARGETS, "kliky", "2026-01-15"), 50);
    assert.equal(targetFor(TARGETS, "kliky", "2026-02-15"), 80);
    assert.equal(targetFor(TARGETS, "kliky", "2026-03-15"), 100);
  });

  it("v den změny už platí nový cíl", () => {
    assert.equal(targetFor(TARGETS, "kliky", "2026-01-31"), 50);
    assert.equal(targetFor(TARGETS, "kliky", "2026-02-01"), 80);
  });

  it("před prvním cílem nevrací nic", () => {
    assert.equal(targetFor(TARGETS, "cteni", "2026-01-14"), null);
    assert.equal(targetFor(TARGETS, "cteni", "2026-01-15"), 20);
  });

  it("nemíchá cíle různých návyků", () => {
    assert.equal(targetFor(TARGETS, "cteni", "2026-03-15"), 20);
  });

  it("nezáleží na pořadí záznamů", () => {
    const shuffled = [...TARGETS].reverse();
    assert.equal(targetFor(shuffled, "kliky", "2026-02-15"), 80);
  });

  it("u neznámého návyku vrátí null", () => {
    assert.equal(targetFor(TARGETS, "neexistuje", "2026-02-15"), null);
  });
});

describe("formatTarget a formatActual", () => {
  it("popisuje minuty a opakování", () => {
    assert.equal(formatTarget("minutes", 20), "20 min");
    assert.equal(formatTarget("reps", 50), "50×");
    assert.equal(formatActual("reps", 62), "62×");
  });

  it("u ano/ne nemá co ukázat", () => {
    assert.equal(formatTarget("boolean", 1), null);
    assert.equal(formatTarget("minutes", null), null);
  });
});

function habitWith(
  id: string,
  entryStatus: "done" | "missed" | null,
): HabitForDay {
  const habit = {
    id,
    program_id: "p",
    client_id: "c",
    title: id,
    description: null,
    link_url: null,
    type: "boolean" as const,
    position: 0,
    archived_at: null,
    reminder_enabled: false,
    reminder_time: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } satisfies Habit;

  const entry: HabitEntry | null = entryStatus
    ? {
        id: `${id}-e`,
        habit_id: id,
        client_id: "c",
        entry_date: "2026-01-01",
        status: entryStatus,
        actual_value: null,
        target_snapshot: null,
        note: null,
        backfilled: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }
    : null;

  return { ...habit, target: null, entry };
}

describe("dayStatus", () => {
  it("všechno splněno", () => {
    assert.equal(
      dayStatus([habitWith("a", "done"), habitWith("b", "done")]),
      "complete",
    );
  });

  it("jeden odkliknutý jako nesplněný", () => {
    assert.equal(
      dayStatus([habitWith("a", "done"), habitWith("b", "missed")]),
      "incomplete",
    );
  });

  it("nevyplněný návyk má přednost před nesplněným", () => {
    // Den, kde klient jeden návyk odklikl jako nesplněný a druhý nechal
    // prázdný, ještě není uzavřený — může ho doplnit.
    assert.equal(
      dayStatus([habitWith("a", "missed"), habitWith("b", null)]),
      "empty",
    );
  });

  it("nic nevyplněno", () => {
    assert.equal(dayStatus([habitWith("a", null)]), "empty");
  });

  it("den bez návyků je nevyplněný", () => {
    assert.equal(dayStatus([]), "empty");
  });
});

describe("streakEndingAt", () => {
  const days = [
    { date: "2026-01-01", status: "complete" as const },
    { date: "2026-01-02", status: "complete" as const },
    { date: "2026-01-03", status: "incomplete" as const },
    { date: "2026-01-04", status: "complete" as const },
    { date: "2026-01-05", status: "complete" as const },
    { date: "2026-01-06", status: "complete" as const },
    { date: "2026-01-07", status: "empty" as const },
  ];

  it("počítá dny v řadě zpětně od daného dne", () => {
    assert.equal(streakEndingAt(days, "2026-01-06"), 3);
    assert.equal(streakEndingAt(days, "2026-01-05"), 2);
    assert.equal(streakEndingAt(days, "2026-01-04"), 1);
  });

  it("nesplněný den sérii ukončí", () => {
    assert.equal(streakEndingAt(days, "2026-01-03"), 0);
  });

  it("nevyplněný den sérii ukončí", () => {
    assert.equal(streakEndingAt(days, "2026-01-07"), 0);
  });

  it("série může sahat až na první den programu", () => {
    assert.equal(streakEndingAt(days, "2026-01-02"), 2);
    assert.equal(streakEndingAt(days, "2026-01-01"), 1);
  });

  it("neznámý den nemá sérii", () => {
    assert.equal(streakEndingAt(days, "2026-02-01"), 0);
  });
});

describe("runningStreak", () => {
  it("dokud dnešek není hotový, počítá se ke včerejšku", () => {
    const days = [
      { date: "2026-01-04", status: "complete" as const },
      { date: "2026-01-05", status: "complete" as const },
      { date: "2026-01-06", status: "empty" as const },
    ];
    assert.equal(runningStreak(days, "2026-01-06", "2026-01-05"), 2);
  });

  it("hotový dnešek se do série započítá", () => {
    const days = [
      { date: "2026-01-04", status: "complete" as const },
      { date: "2026-01-05", status: "complete" as const },
      { date: "2026-01-06", status: "complete" as const },
    ];
    assert.equal(runningStreak(days, "2026-01-06", "2026-01-05"), 3);
  });

  it("nesplněný včerejšek sérii ukončil", () => {
    const days = [
      { date: "2026-01-04", status: "complete" as const },
      { date: "2026-01-05", status: "incomplete" as const },
      { date: "2026-01-06", status: "empty" as const },
    ];
    assert.equal(runningStreak(days, "2026-01-06", "2026-01-05"), 0);
  });
});

describe("wasActiveOn", () => {
  const base = habitWith("a", null);

  it("nearchivovaný návyk platí vždy", () => {
    assert.equal(wasActiveOn(base, "2026-05-05"), true);
  });

  it("archivovaný návyk platí do dne archivace", () => {
    const archived = { ...base, archived_at: "2026-03-10T12:00:00Z" };
    assert.equal(wasActiveOn(archived, "2026-03-09"), true);
    // V den archivace už se nevyplňuje.
    assert.equal(wasActiveOn(archived, "2026-03-10"), false);
    assert.equal(wasActiveOn(archived, "2026-03-11"), false);
  });
});
