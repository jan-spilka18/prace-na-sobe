import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { formatRating, summarizeFeedback } from "./feedbackOverview";

const TODAY = "2026-11-18";

describe("summarizeFeedback", () => {
  it("spočítá průměr jen z vyplněných hodnocení", () => {
    const summary = summarizeFeedback(
      [
        { rating: 9, created_at: "2026-11-18T10:00:00Z" },
        { rating: 8, created_at: "2026-11-10T10:00:00Z" },
        { rating: null, created_at: "2026-11-01T10:00:00Z" },
        { created_at: "2026-10-01T10:00:00Z" },
      ],
      TODAY,
    );
    assert.equal(summary.count, 4);
    assert.equal(summary.average, 8.5);
  });

  it("bez hodnocení není průměr nula, ale žádný", () => {
    assert.equal(summarizeFeedback([{ created_at: "2026-11-18" }], TODAY).average, null);
    assert.equal(summarizeFeedback([], TODAY).average, null);
  });

  it("za poslední týden počítá dnešek a šest dní zpět", () => {
    const summary = summarizeFeedback(
      [
        { created_at: "2026-11-18T08:00:00Z" },
        { created_at: "2026-11-12T08:00:00Z" },
        { created_at: "2026-11-11T08:00:00Z" },
      ],
      TODAY,
    );
    assert.equal(summary.lastWeek, 2);
  });
});

describe("formatRating", () => {
  it("píše desetinnou čárku", () => {
    assert.equal(formatRating(8.5), "8,5");
    assert.equal(formatRating(9), "9");
  });
});
