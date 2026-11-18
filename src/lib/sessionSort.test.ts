import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  parseCzechDate,
  parseSessionKind,
  plainLabel,
  sortSessionText,
} from "./sessionSort";

const SAMPLE = [
  "Shrnutí sezení",
  "Petr přišel po náročném týdnu v práci.",
  "",
  "Klíčové body:",
  "- Ranní rutina se rozpadá už večer předtím – **pozdní usínání** je hlavní spouštěč.",
  "- Když má jasný plán na ráno, drží návyky i v náročném týdnu.",
  "",
  "Co se povedlo",
  "Celý týden zvládl ranní běh.",
  "",
  "Další kroky:",
  "1. Do postele nejpozději ve 23:00.",
  "2. Sprchu hned po běhu.",
  "",
  "Na čem budeme pracovat",
  "Hranice v práci a jak říkat ne.",
].join("\n");

describe("plainLabel", () => {
  it("srovná nadpis do porovnatelné podoby", () => {
    assert.equal(plainLabel("## Úkoly do příště:"), "ukoly do priste");
    assert.equal(plainLabel("**KLÍČOVÉ BODY**"), "klicove body");
    assert.equal(plainLabel("2) Shrnutí"), "shrnuti");
  });
});

describe("sortSessionText", () => {
  it("rozřadí zápis s nadpisy, i když se jmenují jinak než sekce", () => {
    const { content, found } = sortSessionText(SAMPLE);
    assert.equal(content.summary, "Petr přišel po náročném týdnu v práci.");
    assert.ok(content.insights.startsWith("- Ranní rutina"));
    assert.ok(content.insights.includes("**pozdní usínání**"));
    assert.equal(content.wins, "Celý týden zvládl ranní běh.");
    assert.equal(content.tasks, "1. Do postele nejpozději ve 23:00.\n2. Sprchu hned po běhu.");
    assert.equal(content.focus, "Hranice v práci a jak říkat ne.");
    assert.deepEqual(found, ["summary", "insights", "wins", "focus", "tasks"]);
  });

  it("pozná nadpisy z Markdownu a tučné nadpisy", () => {
    const { content } = sortSessionText(
      "## Hlavní body\n- A\n\n**Úkoly do příště (do 25. 11.)**\n- B",
    );
    assert.equal(content.insights, "- A");
    assert.equal(content.tasks, "- B");
  });

  it("nadpis s obsahem na jednom řádku", () => {
    const { content } = sortSessionText("Úkoly: zavolat do banky\nDruhý řádek");
    assert.equal(content.tasks, "zavolat do banky\nDruhý řádek");
  });

  it("text bez nadpisů skončí celý ve Shrnutí", () => {
    const { content, found } = sortSessionText("Jen souvislý text.\n\nDalší odstavec.");
    assert.equal(content.summary, "Jen souvislý text.\n\nDalší odstavec.");
    assert.equal(content.tasks, "");
    assert.deepEqual(found, []);
  });

  it("obyčejnou větu nepovažuje za nadpis", () => {
    const { content } = sortSessionText(
      "Úkoly do příště\n1. Úkol na zítra je zavolat mámě.\n- Úkoly: rozepsat plán",
    );
    assert.equal(content.tasks, "1. Úkol na zítra je zavolat mámě.\n- Úkoly: rozepsat plán");
  });

  it("věta s dvojtečkou zůstane a neznámý nadpis se zachová tučně", () => {
    const { content } = sortSessionText("Petr zmínil tři věci:\n# Dech\nNádech na čtyři");
    assert.equal(content.summary, "Petr zmínil tři věci:\n**Dech**\nNádech na čtyři");
  });

  it("zvládne konce řádků z Windows", () => {
    const { content } = sortSessionText("Shrnutí\r\nText\r\nÚkoly:\r\n- A");
    assert.equal(content.summary, "Text");
    assert.equal(content.tasks, "- A");
  });
});


// Vyplněná ukázka z Honzovy šablony zápisu, beze změny tvaru.
const TEMPLATE = `Klient: Martin Ukázkový
Datum sezení: 12.11.2026
Sezení č.: 4
Týden programu: 5 / 12
Typ sezení: Koučink

## Shrnutí sezení
Vrátili jsme se k poslednímu zápasu, po kterém jsi byl na sebe naštvaný kvůli druhému gólu.

## Klíčová uvědomění
- „Ten gól mě nestojí zápas, stojí mě ho těch pět minut potom.“
- Když se soustředíš na dech a na puk, hlava ztichne sama.

## Závazky a denní návyky
Denní návyky v 90denní výzvě:
- Meditace a vizualizace 15 minut ráno
- 10 minut protažení před spaním
Další závazky:
- Po každém obdrženém gólu použít rituál „nádech, hokejka o tyč, další puk“

## Fokus do příštího sezení
Sledovat, jak rychle se po chybě vracíš do hry.

## Otázka k zamyšlení
Co by se změnilo, kdyby sis po gólu řekl totéž, co bys řekl spoluhráči?

## Úkoly
Vyzkoušet rituál po gólu ve dvou zápasech — Martin — do 26.11.2026 — po zápase si zapsat, jak to šlo
Poslat meditační nahrávku — Honza — k ověření — termín na sezení nezazněl

## Nepovinná doporučení
- Před zápasem zkusit pět minut klidného dýchání nosem v kabině

---
POZNÁMKA PRO HONZU (neposílat)
- K ověření: termín odeslání meditační nahrávky
- Vynecháno: zmínka o sporu s trenérem, zazněla v důvěře`;

describe("sortSessionText se šablonou zápisu", () => {
  const result = sortSessionText(TEMPLATE);

  it("najde všech sedm sekcí", () => {
    assert.deepEqual(result.found, [
      "summary",
      "insights",
      "commitments",
      "focus",
      "question",
      "tasks",
      "recommendations",
    ]);
  });

  it("z hlavičky vezme datum a typ, do zápisu ji nedá", () => {
    assert.deepEqual(result.meta, { date: "2026-11-12", kind: "coaching" });
    assert.ok(result.content.summary.startsWith("Vrátili jsme se"));
    assert.ok(!result.content.summary.includes("Klient:"));
  });

  it("podnadpisy v závazcích zůstanou v textu", () => {
    assert.ok(result.content.commitments.startsWith("Denní návyky v 90denní výzvě:"));
    assert.ok(result.content.commitments.includes("Další závazky:"));
  });

  it("poznámka pro Honzu se oddělí a klientovi nezůstane nikde", () => {
    assert.equal(
      result.privateNote,
      "- K ověření: termín odeslání meditační nahrávky\n- Vynecháno: zmínka o sporu s trenérem, zazněla v důvěře",
    );
    const visible = Object.values(result.content).join("\n");
    assert.ok(!visible.includes("trenérem"));
    assert.ok(!visible.includes("POZNÁMKA"));
    assert.ok(!visible.includes("---"));
  });

  it("úkoly zůstanou po řádcích", () => {
    assert.equal(result.content.tasks.split("\n").length, 2);
  });
});

describe("hlavička", () => {
  it("datum v různých tvarech", () => {
    assert.equal(parseCzechDate("12.11.2026"), "2026-11-12");
    assert.equal(parseCzechDate("3. 2. 2027"), "2027-02-03");
    assert.equal(parseCzechDate("31.02.2026"), undefined);
    assert.equal(parseCzechDate("zítra"), undefined);
  });

  it("typ sezení", () => {
    assert.equal(parseSessionKind("Koučink"), "coaching");
    assert.equal(parseSessionKind("Dech"), "breathwork");
    assert.equal(parseSessionKind("Reflexe měsíce"), "monthly_review");
    assert.equal(parseSessionKind("Předzápasový hovor"), "pregame");
    assert.equal(parseSessionKind("Něco jiného"), undefined);
  });
});
