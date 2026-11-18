import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { parseTaskLine, parseTasks } from "./sessionTasks";

describe("parseTaskLine", () => {
  it("rozloží řádek podle šablony", () => {
    assert.deepEqual(
      parseTaskLine("Vyzkoušet rituál po gólu — Martin — do 26.11.2026 — po zápase si zapsat"),
      {
        task: "Vyzkoušet rituál po gólu",
        who: "Martin",
        byCoach: false,
        due: "do 26. 11.",
        note: "po zápase si zapsat",
      },
    );
  });

  it("Honzův úkol a termín k ověření", () => {
    const task = parseTaskLine("Poslat nahrávku — Honza — k ověření — termín nezazněl");
    assert.equal(task?.byCoach, true);
    assert.equal(task?.due, "termín upřesníme");
  });

  it("prázdná poznámka s ponechaným oddělovačem", () => {
    const task = parseTaskLine("Doplnit meditace — Martin — do 15.11.2026 — ");
    assert.equal(task?.note, "");
    assert.equal(task?.due, "do 15. 11.");
  });

  it("řádek bez oddělovače není úkol ze šablony", () => {
    assert.equal(parseTaskLine("- Do postele ve 23:00"), null);
    assert.equal(parseTaskLine(""), null);
  });
});

describe("parseTasks", () => {
  it("starší odrážky vrátí jako zbytek textu", () => {
    const { tasks, rest } = parseTasks("Úkol A — Petr — do 1.12.2026 — \n1. Starý úkol");
    assert.equal(tasks.length, 1);
    assert.equal(rest, "1. Starý úkol");
  });
});
