import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { dueReminders, isDue, parseMinutes, reminderBody } from "./reminders";
import type { RemindableHabit } from "./reminders";

function habit(over: Partial<RemindableHabit> = {}): RemindableHabit {
  return {
    id: "h1",
    title: "Meditace",
    weekdays: [1, 2, 3, 4, 5, 6, 7],
    reminder_enabled: true,
    reminder_time: "07:30:00",
    archived_at: null,
    filled: false,
    ...over,
  };
}

// 2026-01-05 je pondělí.
const MONDAY = "2026-01-05";
const SATURDAY = "2026-01-10";

describe("parseMinutes", () => {
  it("bere hh:mm i hh:mm:ss", () => {
    assert.equal(parseMinutes("07:30"), 450);
    assert.equal(parseMinutes("07:30:00"), 450);
    assert.equal(parseMinutes("00:00"), 0);
    assert.equal(parseMinutes("23:59"), 1439);
  });

  it("odmítne nesmysl", () => {
    assert.equal(parseMinutes("24:00"), null);
    assert.equal(parseMinutes("7:30"), null);
    assert.equal(parseMinutes(""), null);
    assert.equal(parseMinutes("ráno"), null);
  });
});

describe("isDue", () => {
  it("pošle se v okně po nastaveném čase", () => {
    assert.equal(isDue(habit(), MONDAY, 450, 15), true);
    assert.equal(isDue(habit(), MONDAY, 460, 15), true);
    assert.equal(isDue(habit(), MONDAY, 465, 15), true);
  });

  it("nepošle se dopředu", () => {
    assert.equal(isDue(habit(), MONDAY, 449, 15), false);
    assert.equal(isDue(habit(), MONDAY, 300, 15), false);
  });

  it("nepošle se po vypršení okna", () => {
    assert.equal(isDue(habit(), MONDAY, 466, 15), false);
  });

  it("vypnutá připomínka nikdy", () => {
    assert.equal(
      isDue(habit({ reminder_enabled: false }), MONDAY, 450, 15),
      false,
    );
    assert.equal(isDue(habit({ reminder_time: null }), MONDAY, 450, 15), false);
  });

  it("už vyplněný návyk se nepřipomíná", () => {
    assert.equal(isDue(habit({ filled: true }), MONDAY, 450, 15), false);
  });

  it("respektuje dny v týdnu", () => {
    const workdays = habit({ weekdays: [1, 2, 3, 4, 5] });
    assert.equal(isDue(workdays, MONDAY, 450, 15), true);
    assert.equal(isDue(workdays, SATURDAY, 450, 15), false);
  });

  it("chybějící rozvrh bere jako každý den", () => {
    assert.equal(isDue(habit({ weekdays: null }), SATURDAY, 450, 15), true);
    assert.equal(isDue(habit({ weekdays: [] }), SATURDAY, 450, 15), true);
  });

  it("archivovaný návyk se nepřipomíná", () => {
    const archived = habit({ archived_at: "2026-01-01T10:00:00Z" });
    assert.equal(isDue(archived, MONDAY, 450, 15), false);
  });

  it("archivace do budoucna ještě neplatí", () => {
    const archived = habit({ archived_at: "2026-02-01T10:00:00Z" });
    assert.equal(isDue(archived, MONDAY, 450, 15), true);
  });

  it("okno se nepřetáčí přes půlnoc", () => {
    // Připomínka na 23:50 se v 00:05 dalšího dne nesmí poslat znovu.
    const late = habit({ reminder_time: "23:50" });
    assert.equal(isDue(late, MONDAY, 5, 15), false);
  });

  it("půlnoční připomínku okno nepropásne", () => {
    assert.equal(isDue(habit({ reminder_time: "00:00" }), MONDAY, 5, 15), true);
  });
});

describe("dueReminders", () => {
  it("vybere jen ty, na které je čas", () => {
    const habits = [
      habit({ id: "a", reminder_time: "07:30" }),
      habit({ id: "b", reminder_time: "20:00" }),
      habit({ id: "c", reminder_time: "07:35" }),
    ];
    const due = dueReminders(habits, MONDAY, 455, 15);
    assert.deepEqual(due.map((h) => h.id), ["a", "c"]);
  });
});

describe("reminderBody", () => {
  it("jeden, dva a víc návyků", () => {
    assert.equal(reminderBody([habit({ title: "Meditace" })]), "Meditace");
    assert.equal(
      reminderBody([habit({ title: "Meditace" }), habit({ title: "Kliky" })]),
      "Meditace a Kliky",
    );
    assert.equal(
      reminderBody([
        habit({ title: "Meditace" }),
        habit({ title: "Kliky" }),
        habit({ title: "Otužování" }),
      ]),
      "Meditace a další 2",
    );
  });
});
