import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  addDays,
  clampedProgramDay,
  daysBetween,
  describeDay,
  formatCzechDate,
  formatCzechDayMonth,
  formatCzechWeekday,
  minutesSinceMidnight,
  programDay,
  todayISO,
} from "./date";

describe("todayISO", () => {
  it("bere datum z pražského pásma, ne z UTC", () => {
    // 22:30 UTC v létě je v Praze 00:30 následujícího dne.
    assert.equal(todayISO(new Date("2026-06-15T22:30:00Z")), "2026-06-16");
    // V zimě je posun jen hodina, takže 22:30 UTC je ještě týž den.
    assert.equal(todayISO(new Date("2026-01-15T22:30:00Z")), "2026-01-15");
    assert.equal(todayISO(new Date("2026-01-15T23:30:00Z")), "2026-01-16");
  });
});

describe("minutesSinceMidnight", () => {
  it("počítá pražský čas", () => {
    // 06:00 UTC v létě = 08:00 v Praze.
    assert.equal(minutesSinceMidnight(new Date("2026-06-15T06:00:00Z")), 8 * 60);
    // 06:00 UTC v zimě = 07:00 v Praze.
    assert.equal(minutesSinceMidnight(new Date("2026-01-15T06:00:00Z")), 7 * 60);
  });
});

describe("addDays", () => {
  it("přičítá a odčítá dny", () => {
    assert.equal(addDays("2026-01-01", 1), "2026-01-02");
    assert.equal(addDays("2026-01-01", -1), "2025-12-31");
    assert.equal(addDays("2026-01-31", 1), "2026-02-01");
  });

  it("nepřeskočí den při přechodu na letní čas", () => {
    // V Evropě se mění čas 29. 3. 2026 — ten den má jen 23 hodin.
    assert.equal(addDays("2026-03-28", 1), "2026-03-29");
    assert.equal(addDays("2026-03-29", 1), "2026-03-30");
  });

  it("nezopakuje den při přechodu na zimní čas", () => {
    // 25. 10. 2026 má 25 hodin.
    assert.equal(addDays("2026-10-24", 1), "2026-10-25");
    assert.equal(addDays("2026-10-25", 1), "2026-10-26");
  });

  it("zvládne přestupný rok", () => {
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
    assert.equal(addDays("2028-02-29", 1), "2028-03-01");
  });
});

describe("daysBetween", () => {
  it("počítá rozdíl dní", () => {
    assert.equal(daysBetween("2026-01-01", "2026-01-01"), 0);
    assert.equal(daysBetween("2026-01-01", "2026-01-02"), 1);
    assert.equal(daysBetween("2026-01-02", "2026-01-01"), -1);
  });

  it("drží se i přes změnu času", () => {
    // Celá 90denní výzva přes jarní i podzimní přechod.
    assert.equal(daysBetween("2026-02-01", "2026-05-02"), 90);
    assert.equal(daysBetween("2026-09-01", "2026-11-30"), 90);
  });
});

describe("programDay", () => {
  it("první den programu je 1, ne 0", () => {
    assert.equal(programDay("2026-01-01", "2026-01-01"), 1);
    assert.equal(programDay("2026-01-01", "2026-01-02"), 2);
    assert.equal(programDay("2026-01-01", "2026-03-31"), 90);
  });

  it("před začátkem vrací nulu nebo záporné číslo", () => {
    assert.equal(programDay("2026-01-10", "2026-01-09"), 0);
  });
});

describe("clampedProgramDay", () => {
  it("před začátkem hlásí 0", () => {
    assert.equal(clampedProgramDay("2026-01-10", 90, "2026-01-01"), 0);
  });

  it("po konci se zastaví na poslední den", () => {
    assert.equal(clampedProgramDay("2026-01-01", 90, "2026-03-31"), 90);
    assert.equal(clampedProgramDay("2026-01-01", 90, "2026-12-31"), 90);
  });

  it("uvnitř programu vrací skutečný den", () => {
    assert.equal(clampedProgramDay("2026-01-01", 90, "2026-01-15"), 15);
  });
});

describe("české formátování", () => {
  it("skloňuje měsíc", () => {
    assert.equal(formatCzechDate("2026-01-05"), "5. ledna 2026");
    assert.equal(formatCzechDate("2026-09-22"), "22. září 2026");
    assert.equal(formatCzechDate("2026-12-31"), "31. prosince 2026");
  });

  it("pojmenuje den v týdnu", () => {
    // 22. 9. 2026 je úterý.
    assert.equal(formatCzechWeekday("2026-09-22"), "úterý");
    assert.equal(formatCzechWeekday("2026-09-27"), "neděle");
  });

  it("popisuje blízké dny slovy", () => {
    assert.equal(describeDay("2026-09-22", "2026-09-22"), "dnes");
    assert.equal(describeDay("2026-09-21", "2026-09-22"), "včera");
    assert.equal(describeDay("2026-09-20", "2026-09-22"), "předevčírem");
    assert.equal(describeDay("2026-09-15", "2026-09-22"), "15. září 2026");
  });
});

describe("formatCzechDayMonth", () => {
  it("vynechá rok", () => {
    assert.equal(formatCzechDayMonth("2026-09-23"), "23. září");
    assert.equal(formatCzechDayMonth("2026-01-01"), "1. ledna");
    assert.equal(formatCzechDayMonth("2026-12-31"), "31. prosince");
  });

  it("nedoplňuje nulu před jednociferný den", () => {
    assert.equal(formatCzechDayMonth("2026-05-07"), "7. května");
  });
});
