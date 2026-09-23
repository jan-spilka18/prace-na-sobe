import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { parseTheme } from "./theme";

describe("parseTheme", () => {
  it("přijme světlý a tmavý", () => {
    assert.equal(parseTheme("light"), "light");
    assert.equal(parseTheme("dark"), "dark");
  });

  it("cokoli jiného znamená podle telefonu", () => {
    assert.equal(parseTheme(undefined), "auto");
    assert.equal(parseTheme("auto"), "auto");
    assert.equal(parseTheme(""), "auto");
    assert.equal(parseTheme("<script>"), "auto");
  });
});
