import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { sessionEmail } from "./sessionEmail";

const base = {
  sessionId: "s1",
  date: "2026-11-18",
  kind: "coaching" as const,
  order: 5,
  appUrl: "https://prace-na-sobe.vercel.app",
  content: {
    summary: "Probírali jsme **spánek**.",
    focus: "Všímat si srovnávání.",
    question: "Komu něco dokazuješ?",
    tasks: "Petr:\n- Do postele ve 23:00 — do pátku\nHonza:\n- Poslat nahrávku",
    recommendations: "- Kniha Atomové návyky",
  },
};

describe("sessionEmail", () => {
  it("předmět nese datum a fokus", () => {
    const email = sessionEmail(base);
    assert.equal(email.subject, "Zápis z našeho sezení 18. 11. – tvůj fokus do příště");
  });

  it("obsahuje sekce, úkoly a tučné písmo", () => {
    const { html } = sessionEmail(base);
    assert.ok(html.includes("Všímat si srovnávání."));
    assert.ok(html.includes("<strong>spánek</strong>"));
    assert.ok(html.includes("Do postele ve 23:00"));
    assert.ok(html.includes("Co pro tebe udělá Honza"));
    assert.ok(html.includes("Kniha Atomové návyky"));
    assert.ok(html.includes("Koučink · 5. sezení"));
  });

  it("má odkazy s hodnocením 1–10 na zpětnou vazbu", () => {
    const { html } = sessionEmail(base);
    for (let n = 1; n <= 10; n++) {
      assert.ok(
        html.includes(`https://prace-na-sobe.vercel.app/sezeni/s1?hodnoceni=${n}#zpetna-vazba`),
        `chybí odkaz na ${n}`,
      );
    }
  });

  it("text ze zápisu neprojde jako HTML", () => {
    const { html } = sessionEmail({
      ...base,
      content: { summary: '<script>alert("x")</script>' },
    });
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
  });

  it("má i textovou verzi s odkazem", () => {
    const { text } = sessionEmail(base);
    assert.ok(text.includes("https://prace-na-sobe.vercel.app/sezeni/s1#zpetna-vazba"));
  });
});

describe("sessionEmail — datum a pozdrav", () => {
  it("v hlavičce je datum sezení, ne den odeslání", () => {
    const { html } = sessionEmail({ ...base, date: "2026-11-04" });
    assert.ok(html.includes("4. listopadu"));
  });

  it("pozdrav nezávisí na dni odeslání", () => {
    const { html, text } = sessionEmail(base);
    assert.ok(html.includes("Ahoj, díky za společné sezení."));
    assert.ok(html.includes("Jak ti naše sezení sedlo?"));
    assert.ok(!html.includes("dnešek") && !html.includes("dnešní"));
    assert.ok(!text.includes("dnešek") && !text.includes("dnešní"));
  });
});
