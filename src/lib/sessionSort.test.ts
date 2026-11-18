import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { plainLabel, sortSessionText, suggestTopics } from "./sessionSort";

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
    assert.ok(content.key_points.startsWith("- Ranní rutina"));
    assert.ok(content.key_points.includes("**pozdní usínání**"));
    assert.equal(content.wins, "Celý týden zvládl ranní běh.");
    assert.equal(content.tasks, "1. Do postele nejpozději ve 23:00.\n2. Sprchu hned po běhu.");
    assert.equal(content.focus, "Hranice v práci a jak říkat ne.");
    assert.deepEqual(found, ["summary", "key_points", "wins", "tasks", "focus"]);
  });

  it("pozná nadpisy z Markdownu a tučné nadpisy", () => {
    const { content } = sortSessionText(
      "## Hlavní body\n- A\n\n**Úkoly do příště (do 25. 11.)**\n- B",
    );
    assert.equal(content.key_points, "- A");
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

describe("suggestTopics", () => {
  it("vezme tučné slovo, začátek věty a krátí na celá slova", () => {
    const { content } = sortSessionText(SAMPLE);
    assert.deepEqual(suggestTopics(content), [
      "Pozdní usínání",
      "Když má jasný plán na ráno",
      "Hranice v práci a jak říkat ne",
    ]);
  });

  it("dlouhou větu zkrátí a duplicity vynechá", () => {
    const topics = suggestTopics({
      key_points:
        "- Výčitky po vynechaném dni mu berou víc energie než samotný návyk\n- **Spánek**\n- **spánek**",
    });
    assert.deepEqual(topics, ["Výčitky po vynechaném dni mu berou víc…", "Spánek"]);
  });

  it("bez hlavních bodů nenavrhne nic", () => {
    assert.deepEqual(suggestTopics({ summary: "Text" }), []);
  });
});
