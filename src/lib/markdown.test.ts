import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { parseInline, parseMarkdown, plainText } from "./markdown";

describe("parseInline", () => {
  it("nechá prostý text být", () => {
    assert.deepEqual(parseInline("Ahoj světe"), [
      { kind: "text", text: "Ahoj světe" },
    ]);
  });

  it("pozná tučné", () => {
    assert.deepEqual(parseInline("dej **důraz** sem"), [
      { kind: "text", text: "dej " },
      { kind: "strong", text: "důraz" },
      { kind: "text", text: " sem" },
    ]);
  });

  it("pozná kurzívu", () => {
    assert.deepEqual(parseInline("*jemně*"), [{ kind: "em", text: "jemně" }]);
  });

  it("tučné má přednost před kurzívou", () => {
    // Kdyby se hledala nejdřív jedna hvězdička, `**text**` by se rozpadlo
    // na kurzívu a osamělé hvězdičky kolem.
    assert.deepEqual(parseInline("**tučné**"), [
      { kind: "strong", text: "tučné" },
    ]);
  });

  it("osamělou hvězdičku nechá být", () => {
    assert.deepEqual(parseInline("5 * 3 = 15"), [
      { kind: "text", text: "5 * 3 = 15" },
    ]);
  });
});

describe("parseMarkdown", () => {
  it("udělá odstavec", () => {
    const blocks = parseMarkdown("První věta.\nDruhá věta.");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].kind, "paragraph");
  });

  it("prázdný řádek dělí bloky", () => {
    const blocks = parseMarkdown("První.\n\nDruhý.");
    assert.equal(blocks.length, 2);
  });

  it("pozná odrážky", () => {
    const blocks = parseMarkdown("- první\n- druhá\n- třetí");
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].kind, "bullets");
    assert.equal(blocks[0].kind === "bullets" && blocks[0].items.length, 3);
  });

  it("bere i hvězdičku a odrážku jako znak", () => {
    assert.equal(parseMarkdown("* první\n* druhá")[0].kind, "bullets");
    assert.equal(parseMarkdown("• první\n• druhá")[0].kind, "bullets");
  });

  it("pozná číslovaný seznam", () => {
    const blocks = parseMarkdown("1. první\n2. druhá");
    assert.equal(blocks[0].kind, "numbers");
  });

  it("smíšený blok je odstavec", () => {
    // Jeden řádek s odrážkou uprostřed odstavce ještě nedělá seznam.
    const blocks = parseMarkdown("Věta.\n- odrážka");
    assert.equal(blocks[0].kind, "paragraph");
  });

  it("formátování uvnitř odrážky funguje", () => {
    const blocks = parseMarkdown("- něco **důležitého**");
    assert.deepEqual(blocks[0].kind === "bullets" && blocks[0].items[0], [
      { kind: "text", text: "něco " },
      { kind: "strong", text: "důležitého" },
    ]);
  });

  it("prázdný vstup nevyrobí žádný blok", () => {
    assert.deepEqual(parseMarkdown(""), []);
    assert.deepEqual(parseMarkdown("\n\n  \n"), []);
  });

  it("zvládne windowsové konce řádků", () => {
    assert.equal(parseMarkdown("- a\r\n- b")[0].kind, "bullets");
  });
});

describe("plainText", () => {
  it("odstraní značky pro náhled", () => {
    assert.equal(
      plainText("- **Hlavní** bod\n- druhý *bod*"),
      "Hlavní bod druhý bod",
    );
  });

  it("slepí víc řádků do jednoho", () => {
    assert.equal(plainText("první\n\ndruhý"), "první druhý");
  });
});
