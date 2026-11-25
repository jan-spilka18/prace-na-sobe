import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { accessEmail } from "./accessEmail";

const input = {
  email: "petr@example.com",
  password: "Modra-Kocka-42",
  appUrl: "https://prace-na-sobe.vercel.app",
};

describe("accessEmail", () => {
  it("obsahuje odkaz, e-mail i heslo", () => {
    const { html, text, subject } = accessEmail(input);
    assert.equal(subject, "Tvůj přístup do aplikace Práce na sobě");
    for (const body of [html, text]) {
      assert.ok(body.includes("https://prace-na-sobe.vercel.app"));
      assert.ok(body.includes("petr@example.com"));
      assert.ok(body.includes("Modra-Kocka-42"));
    }
  });

  it("heslo se znaky HTML projde jako text", () => {
    const { html } = accessEmail({ ...input, password: 'a<b>"c&d' });
    assert.ok(html.includes("a&lt;b&gt;&quot;c&amp;d"));
    assert.ok(!html.includes('a<b>"c'));
  });
});
