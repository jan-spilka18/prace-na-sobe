import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { normalizeSupabaseUrl } from "./env";

const EXPECTED = "https://abcdefgh.supabase.co";

describe("normalizeSupabaseUrl", () => {
  it("nechá správnou adresu být", () => {
    assert.equal(normalizeSupabaseUrl(EXPECTED), EXPECTED);
  });

  it("odřízne lomítko na konci", () => {
    assert.equal(normalizeSupabaseUrl("https://abcdefgh.supabase.co/"), EXPECTED);
    assert.equal(normalizeSupabaseUrl("https://abcdefgh.supabase.co///"), EXPECTED);
  });

  it("odřízne cestu, kterou Supabase ukazuje u koncových bodů", () => {
    // Tohle shodilo přihlášení: knihovna si za adresu lepí vlastní cestu,
    // takže vzniklo /rest/v1/auth/v1/token a server hlásil Invalid path.
    assert.equal(
      normalizeSupabaseUrl("https://abcdefgh.supabase.co/rest/v1"),
      EXPECTED,
    );
    assert.equal(
      normalizeSupabaseUrl("https://abcdefgh.supabase.co/auth/v1"),
      EXPECTED,
    );
    assert.equal(
      normalizeSupabaseUrl("https://abcdefgh.supabase.co/rest/v1/"),
      EXPECTED,
    );
  });

  it("zvládne mezery zkopírované omylem", () => {
    assert.equal(normalizeSupabaseUrl("  https://abcdefgh.supabase.co  "), EXPECTED);
  });

  it("doplní chybějící https://", () => {
    assert.equal(normalizeSupabaseUrl("abcdefgh.supabase.co"), EXPECTED);
  });

  it("zahodí dotaz i kotvu", () => {
    assert.equal(
      normalizeSupabaseUrl("https://abcdefgh.supabase.co/?foo=1#bar"),
      EXPECTED,
    );
  });
});
