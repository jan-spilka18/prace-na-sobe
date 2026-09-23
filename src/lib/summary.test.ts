import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  describeOutcome,
  isRestDay,
  patternsFor,
  silentDays,
  summarySubject,
  weakWeekday,
  type ClientSummary,
  type DayOutcome,
} from "./summary";

function day(date: string, done: number, missed: number, empty: number): DayOutcome {
  return { date, done, missed, empty };
}

describe("isRestDay a describeOutcome", () => {
  it("den bez jediného návyku je volno", () => {
    assert.equal(isRestDay(day("2026-01-05", 0, 0, 0)), true);
    assert.equal(describeOutcome(day("2026-01-05", 0, 0, 0)), "volno");
  });

  it("popíše splněno, částečně i nevyplněno", () => {
    assert.equal(describeOutcome(day("2026-01-05", 3, 0, 0)), "3 z 3");
    assert.equal(describeOutcome(day("2026-01-05", 1, 1, 1)), "1 z 3");
    assert.equal(describeOutcome(day("2026-01-05", 0, 0, 3)), "nevyplněno");
  });

  it("nesplněno není totéž co nevyplněno", () => {
    assert.equal(describeOutcome(day("2026-01-05", 0, 3, 0)), "0 z 3");
  });
});

describe("silentDays", () => {
  it("počítá dny bez jediného doteku odzadu", () => {
    const history = [
      day("2026-01-05", 3, 0, 0),
      day("2026-01-06", 0, 0, 3),
      day("2026-01-07", 0, 0, 3),
    ];
    assert.equal(silentDays(history), 2);
  });

  it("nesplněno ticho přeruší — člověk appku otevřel", () => {
    const history = [
      day("2026-01-05", 0, 0, 3),
      day("2026-01-06", 0, 3, 0),
      day("2026-01-07", 0, 0, 3),
    ];
    assert.equal(silentDays(history), 1);
  });

  it("volno ticho nezakládá ani nepřeruší", () => {
    const history = [
      day("2026-01-05", 3, 0, 0),
      day("2026-01-06", 0, 0, 0),
      day("2026-01-07", 0, 0, 3),
    ];
    assert.equal(silentDays(history), 1);
  });

  it("aktivní klient mlčí nula dní", () => {
    assert.equal(silentDays([day("2026-01-07", 3, 0, 0)]), 0);
  });

  it("prázdná historie", () => {
    assert.equal(silentDays([]), 0);
  });
});

describe("weakWeekday", () => {
  // 2026-01-05, 12, 19 jsou pondělky.
  it("ohlásí den, který selhal aspoň třikrát a vždy", () => {
    const history = [
      day("2026-01-05", 0, 1, 0),
      day("2026-01-12", 0, 0, 1),
      day("2026-01-19", 0, 1, 0),
    ];
    assert.equal(weakWeekday(history), "Po");
  });

  it("dvakrát je náhoda, ne vzorec", () => {
    const history = [day("2026-01-05", 0, 1, 0), day("2026-01-12", 0, 1, 0)];
    assert.equal(weakWeekday(history), null);
  });

  it("jeden úspěch vzorec ruší", () => {
    const history = [
      day("2026-01-05", 0, 1, 0),
      day("2026-01-12", 2, 0, 0),
      day("2026-01-19", 0, 1, 0),
    ];
    assert.equal(weakWeekday(history), null);
  });

  it("volné dny se do vzorce nepočítají", () => {
    const history = [
      day("2026-01-05", 0, 0, 0),
      day("2026-01-12", 0, 0, 0),
      day("2026-01-19", 0, 0, 0),
    ];
    assert.equal(weakWeekday(history), null);
  });
});

describe("patternsFor", () => {
  it("mlčení pod tři dny se nehlásí", () => {
    const history = [day("2026-01-06", 0, 0, 2), day("2026-01-07", 0, 0, 2)];
    assert.deepEqual(patternsFor("c1", "Petr", history), []);
  });

  it("tři dny ticha už ano", () => {
    const history = [
      day("2026-01-05", 0, 0, 2),
      day("2026-01-06", 0, 0, 2),
      day("2026-01-07", 0, 0, 2),
    ];
    const found = patternsFor("c1", "Petr", history);
    assert.equal(found.length, 1);
    assert.match(found[0].text, /Petr 3 dní nic nevyplnil/);
  });

  it("spokojený klient nevyrobí žádné upozornění", () => {
    const history = [day("2026-01-06", 3, 0, 0), day("2026-01-07", 3, 0, 0)];
    assert.deepEqual(patternsFor("c1", "Petr", history), []);
  });
});

describe("summarySubject", () => {
  function summary(done: number, missed: number, empty: number): ClientSummary {
    return {
      clientId: "c",
      name: "Petr",
      outcome: day("2026-01-07", done, missed, empty),
      streak: 0,
    };
  }

  it("bez upozornění hlásí jen poměr", () => {
    const subject = summarySubject([summary(3, 0, 0), summary(1, 1, 0)], []);
    assert.equal(subject, "Včera: 1 z 2 splnilo všechno");
  });

  it("s upozorněním je zmíní", () => {
    const subject = summarySubject(
      [summary(3, 0, 0)],
      [{ clientId: "c", name: "Petr", text: "…" }],
    );
    assert.equal(subject, "Včera: 1 z 1 a 1 upozornění");
  });

  it("volné dny se do poměru nepočítají", () => {
    const subject = summarySubject([summary(3, 0, 0), summary(0, 0, 0)], []);
    assert.equal(subject, "Včera: 1 z 1 splnilo všechno");
  });
});
