import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { safeUrl } from "./url";

describe("safeUrl", () => {
  it("prázdný vstup není odkaz", () => {
    assert.equal(safeUrl(""), null);
    assert.equal(safeUrl("   "), null);
    assert.equal(safeUrl(null), null);
    assert.equal(safeUrl(undefined), null);
  });

  it("propustí http a https", () => {
    assert.equal(
      safeUrl("https://www.youtube.com/watch?v=abc"),
      "https://www.youtube.com/watch?v=abc",
    );
    assert.equal(safeUrl("http://example.com/a"), "http://example.com/a");
  });

  it("doplní schéma, když chybí", () => {
    assert.equal(safeUrl("youtube.com/watch"), "https://youtube.com/watch");
  });

  it("odmítne spustitelná schémata", () => {
    assert.equal(safeUrl("javascript:alert(1)"), null);
    assert.equal(safeUrl("  JavaScript:alert(1)"), null);
    assert.equal(safeUrl("data:text/html,<script>x</script>"), null);
    assert.equal(safeUrl("vbscript:msgbox(1)"), null);
    assert.equal(safeUrl("file:///etc/passwd"), null);
  });

  it("odmítne nesmysl", () => {
    assert.equal(safeUrl("http://"), null);
    assert.equal(safeUrl("https://"), null);
  });

  it("neplete si schéma s cestou", () => {
    // „mailto" není http, ale „meditace:ranni" je jen text bez schématu.
    assert.equal(safeUrl("mailto:honza@example.com"), null);
  });
});
