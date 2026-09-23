import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  buildOverview,
  streakUpTo,
  yesterdayScore,
} from "./adminOverview";
import type { DayOutcome } from "./summary";
import type { Habit, HabitEntry, Program } from "./database.types";

const TODAY = "2026-01-15"; // čtvrtek
const YESTERDAY = "2026-01-14";

function program(over: Partial<Program> = {}): Program {
  return {
    id: "p1",
    client_id: "c1",
    kind: "challenge",
    title: "90denní výzva",
    start_date: "2026-01-01",
    duration_days: 90,
    status: "active",
    created_at: "",
    updated_at: "",
    ...over,
  } as Program;
}

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    program_id: "p1",
    client_id: "c1",
    title: "Meditace",
    description: null,
    link_url: null,
    type: "boolean",
    position: 0,
    archived_at: null,
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    reminder_enabled: false,
    reminder_time: null,
    created_by: null,
    created_at: "",
    updated_at: "",
    ...over,
  } as Habit;
}

function entry(
  habitId: string,
  date: string,
  status: "done" | "missed",
): Pick<HabitEntry, "habit_id" | "client_id" | "entry_date" | "status"> {
  return { habit_id: habitId, client_id: "c1", entry_date: date, status };
}

const CLIENT = { id: "c1", full_name: "Petr Novák", email: "p@x.cz" };

describe("buildOverview", () => {
  it("klient bez programu nevypadá jako mlčící", () => {
    const rows = buildOverview({
      clients: [CLIENT],
      programs: [],
      habits: [],
      entries: [],
      today: TODAY,
    });

    assert.equal(rows[0].program, null);
    assert.equal(rows[0].dayNumber, null);
    assert.deepEqual(rows[0].patterns, []);
  });

  it("spočítá dnešek i včerejšek zvlášť", () => {
    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program()],
      habits: [habit({ id: "h1" }), habit({ id: "h2", title: "Kliky" })],
      entries: [
        entry("h1", YESTERDAY, "done"),
        entry("h2", YESTERDAY, "done"),
        entry("h1", TODAY, "done"),
      ],
      today: TODAY,
    });

    assert.deepEqual(rows[0].yesterday, {
      date: YESTERDAY,
      done: 2,
      missed: 0,
      empty: 0,
    });
    assert.deepEqual(rows[0].today, {
      date: TODAY,
      done: 1,
      missed: 0,
      empty: 1,
    });
  });

  it("série se počítá ke včerejšku, ne k dnešku", () => {
    // Dnešek je schválně nevyplněný. Kdyby se počítal, série by byla 0
    // a přes den by blikala.
    const entries = [];
    for (let d = 10; d <= 14; d++) {
      entries.push(entry("h1", `2026-01-${d}`, "done"));
    }

    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program()],
      habits: [habit()],
      entries,
      today: TODAY,
    });

    assert.equal(rows[0].streak, 5);
  });

  it("dny před začátkem programu se nepočítají", () => {
    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program({ start_date: "2026-01-14" })],
      habits: [habit()],
      entries: [entry("h1", YESTERDAY, "done")],
      today: TODAY,
    });

    // Jediný uzavřený den je včerejšek a ten je splněný — žádné upozornění.
    assert.deepEqual(rows[0].patterns, []);
    assert.equal(rows[0].streak, 1);
  });

  it("víkendové volno se nehlásí jako výpadek", () => {
    // Návyk jen Po–Pá; 2026-01-10 a 11 je víkend.
    const workday = habit({ weekdays: [1, 2, 3, 4, 5] });
    const entries = [];
    for (const d of [5, 6, 7, 8, 9, 12, 13, 14]) {
      entries.push(entry("h1", `2026-01-${String(d).padStart(2, "0")}`, "done"));
    }

    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program()],
      habits: [workday],
      entries,
      today: TODAY,
    });

    assert.equal(rows[0].streak, 8);
    assert.deepEqual(rows[0].patterns, []);
  });

  it("tři dny ticha vyrobí upozornění", () => {
    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program()],
      habits: [habit()],
      entries: [entry("h1", "2026-01-10", "done")],
      today: TODAY,
    });

    assert.equal(rows[0].patterns.length >= 1, true);
    assert.match(rows[0].patterns[0].text, /nic nevyplnil/);
  });

  it("dnešek se do upozornění nepočítá", () => {
    // Včerejšek a předvčerejšek splněné; dnešek zatím prázdný.
    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program()],
      habits: [habit()],
      entries: [
        entry("h1", "2026-01-13", "done"),
        entry("h1", YESTERDAY, "done"),
      ],
      today: TODAY,
    });

    assert.deepEqual(rows[0].patterns, []);
  });

  it("archivovaný návyk se nepočítá", () => {
    const rows = buildOverview({
      clients: [CLIENT],
      programs: [program()],
      habits: [habit({ archived_at: "2026-01-02T00:00:00Z" })],
      entries: [],
      today: TODAY,
    });

    assert.equal(rows[0].yesterday.empty, 0);
    assert.deepEqual(rows[0].patterns, []);
  });
});

describe("streakUpTo", () => {
  function day(date: string, done: number, missed: number, empty: number): DayOutcome {
    return { date, done, missed, empty };
  }

  it("nepočítá dny po zadaném datu", () => {
    const history = [
      day("2026-01-13", 1, 0, 0),
      day("2026-01-14", 1, 0, 0),
      day("2026-01-15", 0, 0, 1),
    ];
    assert.equal(streakUpTo(history, "2026-01-14"), 2);
  });

  it("nesplněný den sérii ukončí", () => {
    const history = [day("2026-01-13", 0, 1, 0), day("2026-01-14", 1, 0, 0)];
    assert.equal(streakUpTo(history, "2026-01-14"), 1);
  });
});

describe("yesterdayScore", () => {
  it("volné dny a klienty bez programu do poměru nebere", () => {
    const rows = buildOverview({
      clients: [
        CLIENT,
        { id: "c2", full_name: "Bez programu", email: "b@x.cz" },
      ],
      programs: [program()],
      habits: [habit()],
      entries: [entry("h1", YESTERDAY, "done")],
      today: TODAY,
    });

    assert.deepEqual(yesterdayScore(rows), { complete: 1, active: 1 });
  });
});
