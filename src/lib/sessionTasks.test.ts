import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { parseTaskLine, parseTasks, refineTasks } from "./sessionTasks";

describe("parseTaskLine — tvar ze šablony", () => {
  it("Úkol — Kdo — Do kdy — Poznámka", () => {
    assert.deepEqual(
      parseTaskLine("Vyzkoušet rituál po gólu — Martin — do 26.11.2026 — po zápase si zapsat"),
      {
        task: "Vyzkoušet rituál po gólu",
        who: "Martin",
        whoKind: "client",
        due: "do 26. 11.",
        note: "po zápase si zapsat",
      },
    );
  });

  it("Honzův úkol a termín k ověření", () => {
    const task = parseTaskLine("Poslat nahrávku — Honza — k ověření — termín nezazněl");
    assert.equal(task?.whoKind, "coach");
    assert.equal(task?.due, "termín upřesníme");
    assert.equal(task?.note, "termín nezazněl");
  });

  it("prázdná poznámka s ponechaným oddělovačem", () => {
    const task = parseTaskLine("Doplnit meditace — Martin — do 15.11.2026 — ");
    assert.equal(task?.note, "");
    assert.equal(task?.due, "do 15. 11.");
  });
});

describe("parseTaskLine — jiné zápisy", () => {
  it("části v jiném pořadí se poznají podle obsahu", () => {
    const task = parseTaskLine("- Napsat 5 hodnot — do pátku — Kuba");
    assert.equal(task?.task, "Napsat 5 hodnot");
    assert.equal(task?.due, "do pátku");
    assert.equal(task?.who, "Kuba");
  });

  it("svislítka", () => {
    const task = parseTaskLine("Ranní běh 3× týdně | Kuba | 30. 11. 2026 | aspoň 5 km");
    assert.equal(task?.due, "do 30. 11.");
    assert.equal(task?.note, "aspoň 5 km");
  });

  it("řádek tabulky; hlavička a oddělovač nejsou úkol", () => {
    assert.equal(parseTaskLine("| Úkol | Kdo | Do kdy | Poznámka |"), null);
    assert.equal(parseTaskLine("|---|---|---|---|"), null);
    const task = parseTaskLine("| Poslat plán | Honza | 1.12.2026 | |");
    assert.equal(task?.whoKind, "coach");
    assert.equal(task?.due, "do 1. 12.");
  });

  it("popisky Kdo a Do kdy uvnitř řádku", () => {
    const task = parseTaskLine("Sepsat hodnoty (kdo: Kuba, do kdy: příští sezení)");
    assert.equal(task?.task, "Sepsat hodnoty");
    assert.equal(task?.who, "Kuba");
    assert.equal(task?.due, "příští sezení");
  });

  it("úkol spolu s Honzou", () => {
    assert.equal(parseTaskLine("Projít plán — Kuba a Honza — 5.12.2026")?.whoKind, "both");
    assert.equal(parseTaskLine("Projít plán — spolu — na sezení")?.whoKind, "both");
  });

  it("holá věta je úkol bez dalších údajů", () => {
    assert.deepEqual(parseTaskLine("1. Do postele ve 23:00 - aspoň 5 večerů"), {
      task: "Do postele ve 23:00 - aspoň 5 večerů",
      who: "",
      whoKind: "",
      due: "",
      note: "",
    });
  });

  it("prázdný řádek a oddělovač nejsou úkol", () => {
    assert.equal(parseTaskLine(""), null);
    assert.equal(parseTaskLine("---"), null);
  });
});

describe("parseTasks", () => {
  it("podnadpis „Honza:“ přiřadí úkoly pod ním", () => {
    const tasks = parseTasks("Kuba:\n- Napsat hodnoty\nHonza:\n- Poslat nahrávku");
    assert.deepEqual(
      tasks.map((task) => [task.task, task.whoKind]),
      [
        ["Napsat hodnoty", "client"],
        ["Poslat nahrávku", "coach"],
      ],
    );
  });
});

describe("refineTasks", () => {
  it("otázku a tip z úkolů přesune, úkol s termínem z doporučení vrátí", () => {
    const refined = refineTasks({
      tasks: [
        "Napsat hodnoty — Kuba — do pátku",
        "- Co by se změnilo, kdyby sis věřil?",
        "- Zkus si před spaním pustit dechové cvičení",
        "- Doporučuji přečíst Atomové návyky",
      ].join("\n"),
      question: "",
      recommendations: "- Poslat nahrávku — Honza — 1.12.2026",
    });
    assert.equal(
      refined.tasks,
      "Napsat hodnoty — Kuba — do pátku\n- Poslat nahrávku — Honza — 1.12.2026",
    );
    assert.equal(refined.question, "Co by se změnilo, kdyby sis věřil?");
    assert.equal(
      refined.recommendations,
      "- Zkus si před spaním pustit dechové cvičení\n- Doporučuji přečíst Atomové návyky",
    );
  });

  it("tip s termínem a jménem zůstane úkolem", () => {
    const refined = refineTasks({ tasks: "Zkus běhat — Kuba — do pátku" });
    assert.equal(refined.tasks, "Zkus běhat — Kuba — do pátku");
    assert.equal(refined.recommendations, "");
  });
});
