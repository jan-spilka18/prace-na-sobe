import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { formatTotal, habitStats } from "./habitStats";
import type { Habit } from "./database.types";

// Program od pondělí 5. 1. 2026, dnes je pátek 9. 1.
const PROGRAM = { start_date: "2026-01-05", duration_days: 90 };
const TODAY = "2026-01-09";

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: "h1",
    program_id: "p",
    client_id: "c",
    title: "Meditace",
    description: null,
    link_url: null,
    type: "minutes",
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

function done(date: string, actual: number | null, target: number | null = 15) {
  return {
    habit_id: "h1",
    entry_date: date,
    status: "done" as const,
    actual_value: actual,
    target_snapshot: target,
  };
}

function missed(date: string) {
  return {
    habit_id: "h1",
    entry_date: date,
    status: "missed" as const,
    actual_value: null,
    target_snapshot: 15,
  };
}

describe("habitStats — úspěšnost", () => {
  it("počítá jen uzavřené dny, dnešek ne", () => {
    // Po–Čt jsou uzavřené (4 dny), pátek je dnešek.
    const [stat] = habitStats(
      [habit()],
      [done("2026-01-05", 15), done("2026-01-06", 15), done("2026-01-09", 15)],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.scheduled, 4);
    assert.equal(stat.done, 2);
    assert.equal(stat.rate, 50);
  });

  it("první den programu ještě nehodnotí", () => {
    const [stat] = habitStats([habit()], [], PROGRAM, "2026-01-05");
    assert.equal(stat.scheduled, 0);
    assert.equal(stat.rate, null);
  });

  it("respektuje dny v týdnu", () => {
    // Jen Po, St, Pá → z uzavřených Po–Čt připadají dva dny.
    const [stat] = habitStats(
      [habit({ weekdays: [1, 3, 5] })],
      [done("2026-01-05", 15)],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.scheduled, 2);
    assert.equal(stat.rate, 50);
  });

  it("nesplněno se do úspěšnosti počítá jako nesplněno", () => {
    const [stat] = habitStats(
      [habit()],
      [done("2026-01-05", 15), missed("2026-01-06")],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.done, 1);
    assert.equal(stat.scheduled, 4);
  });
});

describe("habitStats — součty", () => {
  it("sčítá skutečné hodnoty včetně dneška", () => {
    const [stat] = habitStats(
      [habit()],
      [done("2026-01-05", 20), done("2026-01-09", 10)],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.total, 30);
  });

  it("splněno bez hodnoty počítá cíl, ne nulu", () => {
    const [stat] = habitStats(
      [habit()],
      [done("2026-01-05", null, 15), done("2026-01-06", null, 20)],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.total, 35);
  });

  it("nesplněné dny do součtu nepatří", () => {
    const [stat] = habitStats([habit()], [missed("2026-01-05")], PROGRAM, TODAY);
    assert.equal(stat.total, 0);
  });

  it("u ano/ne počítá splněné dny", () => {
    const [stat] = habitStats(
      [habit({ type: "boolean" })],
      [done("2026-01-05", null, null), done("2026-01-06", null, null)],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.total, 2);
  });

  it("záznamy mimo program ignoruje", () => {
    const [stat] = habitStats(
      [habit()],
      [done("2026-01-01", 99), done("2026-01-05", 15)],
      PROGRAM,
      TODAY,
    );
    assert.equal(stat.total, 15);
  });
});

describe("habitStats — ukončené návyky", () => {
  it("ukončený návyk bez záznamu vynechá", () => {
    const stats = habitStats(
      [habit({ archived_at: "2026-01-04T10:00:00Z" })],
      [],
      PROGRAM,
      TODAY,
    );
    assert.equal(stats.length, 0);
  });

  it("ukončený návyk s historií ukáže až za aktivními", () => {
    const stats = habitStats(
      [
        habit({ id: "old", title: "Starý", archived_at: "2026-01-07T10:00:00Z" }),
        habit({ id: "h1", title: "Aktivní" }),
      ],
      [done("2026-01-05", 15)],
      PROGRAM,
      TODAY,
    );
    assert.deepEqual(stats.map((s) => s.title), ["Aktivní", "Starý"]);
    assert.equal(stats[1].archived, true);
  });
});

describe("formatTotal", () => {
  it("minuty pod hodinu, přes hodinu i celé hodiny", () => {
    assert.equal(formatTotal("minutes", 45), "Celkem 45 min");
    assert.equal(formatTotal("minutes", 1100), "Celkem 18 h 20 min");
    assert.equal(formatTotal("minutes", 120), "Celkem 2 h");
  });

  it("opakování s oddělením tisíců", () => {
    // Intl dává mezi tisíce nezlomitelnou mezeru, ne obyčejnou.
    assert.equal(formatTotal("reps", 2340).replace(/\s/g, " "), "Celkem 2 340 opakování");
  });

  it("ano/ne jako počet splnění", () => {
    assert.equal(formatTotal("boolean", 23), "Splněno 23×");
  });
});
