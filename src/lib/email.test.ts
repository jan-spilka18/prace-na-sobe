import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { gmailSetupProblem } from "./email";

describe("gmailSetupProblem", () => {
  it("správné údaje projdou", () => {
    assert.equal(gmailSetupProblem("honza@gmail.com", "abcdabcdabcdabcd"), null);
  });

  it("pozná, že v GMAIL_USER není adresa", () => {
    assert.match(gmailSetupProblem("honza", "abcdabcdabcdabcd") ?? "", /GMAIL_USER/);
  });

  it("pozná špatně dlouhé heslo a neprozradí ho", () => {
    const problem = gmailSetupProblem("honza@gmail.com", "tajne-heslo-ktere-je-moc-dlouhe") ?? "";
    assert.match(problem, /má 31 znaků/);
    assert.ok(!problem.includes("tajne"));
  });
});
