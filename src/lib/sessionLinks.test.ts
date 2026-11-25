import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { linkLine, parseLinks } from "./sessionLinks";
import { parseInline, plainText } from "./markdown";

describe("parseLinks", () => {
  it("název a adresa oddělené pomlčkou", () => {
    const [link] = parseLinks("- Dechové cvičení — https://youtu.be/abc123");
    assert.deepEqual(link, {
      label: "Dechové cvičení",
      url: "https://youtu.be/abc123",
      kind: "video",
      host: "youtu.be",
    });
  });

  it("markdown odkaz a dokument", () => {
    const [link] = parseLinks("[Hodnoty k vyplnění](https://docs.google.com/document/d/1)");
    assert.equal(link.label, "Hodnoty k vyplnění");
    assert.equal(link.kind, "doc");
  });

  it("holá adresa dostane název podle druhu", () => {
    assert.equal(parseLinks("https://www.youtube.com/watch?v=1")[0].label, "Video");
    assert.equal(parseLinks("www.example.com/clanek")[0].label, "Odkaz");
    assert.equal(parseLinks("www.example.com/clanek")[0].url, "https://www.example.com/clanek");
  });

  it("adresa bez https a tečka na konci věty", () => {
    const [link] = parseLinks("Podcast: youtu.be/xyz.");
    assert.equal(link.url, "https://youtu.be/xyz");
    assert.equal(link.label, "Podcast");
  });

  it("řádek bez adresy zůstane textem", () => {
    const [link] = parseLinks("- Pošlu ti to zítra");
    assert.equal(link.url, null);
    assert.equal(link.label, "Pošlu ti to zítra");
  });

  it("nebezpečná adresa se nestane odkazem", () => {
    assert.equal(parseLinks("[klikni](javascript:alert(1))")[0].url, null);
  });

  it("linkLine a parseLinks si rozumí", () => {
    const [link] = parseLinks(linkLine("Video o spánku", "https://youtu.be/1"));
    assert.equal(link.label, "Video o spánku");
    assert.equal(link.url, "https://youtu.be/1");
  });
});

describe("odkazy v textu zápisu", () => {
  it("[text](adresa) je odkaz", () => {
    assert.deepEqual(parseInline("Pusť si [video](https://youtu.be/1) večer"), [
      { kind: "text", text: "Pusť si " },
      { kind: "link", text: "video", href: "https://youtu.be/1" },
      { kind: "text", text: " večer" },
    ]);
  });

  it("holá adresa je odkaz, tečka za ní ne", () => {
    const tokens = parseInline("Viz https://example.com/a.");
    assert.deepEqual(tokens[1], { kind: "link", text: "example.com/a", href: "https://example.com/a" });
    assert.deepEqual(tokens[2], { kind: "text", text: "." });
  });

  it("tučné a kurzíva fungují dál", () => {
    assert.deepEqual(parseInline("**tučně** a *šikmo*"), [
      { kind: "strong", text: "tučně" },
      { kind: "text", text: " a " },
      { kind: "em", text: "šikmo" },
    ]);
  });

  it("javascript: se odkazem nestane", () => {
    assert.deepEqual(parseInline("[x](javascript:alert)"), [{ kind: "text", text: "x" }]);
  });

  it("holý text bere z odkazu jen název", () => {
    assert.equal(plainText("Pusť si [video](https://youtu.be/1)"), "Pusť si video");
  });
});
