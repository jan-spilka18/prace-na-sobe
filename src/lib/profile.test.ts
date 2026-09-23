import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  cleanPhone,
  composeVision,
  daysInMonth,
  formatBirthday,
  hasBirthdayOn,
  upcomingBirthdays,
  validBirthday,
} from "./profile";

describe("validBirthday", () => {
  it("nic nevyplněno je v pořádku", () => {
    assert.equal(validBirthday(null, null), true);
  });

  it("den bez měsíce a naopak neprojde", () => {
    assert.equal(validBirthday(15, null), false);
    assert.equal(validBirthday(null, 3), false);
  });

  it("hlídá délku měsíce, 29. února pouští", () => {
    assert.equal(validBirthday(31, 1), true);
    assert.equal(validBirthday(31, 4), false);
    assert.equal(validBirthday(29, 2), true);
    assert.equal(validBirthday(30, 2), false);
    assert.equal(validBirthday(0, 5), false);
    assert.equal(validBirthday(5, 13), false);
  });

  it("daysInMonth souhlasí s kontrolou v databázi", () => {
    assert.deepEqual(
      Array.from({ length: 12 }, (_, i) => daysInMonth(i + 1)),
      [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    );
  });
});

describe("formatBirthday", () => {
  it("den a měsíc ve druhém pádě", () => {
    assert.equal(formatBirthday(15, 3), "15. března");
    assert.equal(formatBirthday(1, 12), "1. prosince");
  });
});

describe("cleanPhone", () => {
  it("prázdné pole znamená bez telefonu", () => {
    assert.deepEqual(cleanPhone("   "), { ok: true, phone: null });
  });

  it("nechá formát, jak ho člověk napsal, jen uklidí mezery", () => {
    assert.deepEqual(cleanPhone(" +420  777 123 456 "), {
      ok: true,
      phone: "+420 777 123 456",
    });
    assert.deepEqual(cleanPhone("777123456"), { ok: true, phone: "777123456" });
  });

  it("odmítne písmena a nesmyslnou délku", () => {
    assert.equal(cleanPhone("zavolej mi").ok, false);
    assert.equal(cleanPhone("123").ok, false);
    assert.equal(cleanPhone("1234567890123456").ok, false);
  });
});

describe("hasBirthdayOn", () => {
  const march15 = { birth_day: 15, birth_month: 3 };

  it("pozná den narozenin v každém roce", () => {
    assert.equal(hasBirthdayOn(march15, "2026-03-15"), true);
    assert.equal(hasBirthdayOn(march15, "2031-03-15"), true);
    assert.equal(hasBirthdayOn(march15, "2026-03-16"), false);
  });

  it("bez vyplněných narozenin nikdy", () => {
    assert.equal(hasBirthdayOn({ birth_day: null, birth_month: null }, "2026-03-15"), false);
  });

  it("29. února slaví v nepřestupném roce 28.", () => {
    const leapling = { birth_day: 29, birth_month: 2 };
    assert.equal(hasBirthdayOn(leapling, "2027-02-28"), true);
    assert.equal(hasBirthdayOn(leapling, "2028-02-29"), true);
    assert.equal(hasBirthdayOn(leapling, "2028-02-28"), false);
  });
});

describe("upcomingBirthdays", () => {
  const people = [
    { full_name: "Petr", email: "p@x.cz", birth_day: 16, birth_month: 3 },
    { full_name: "Jana", email: "j@x.cz", birth_day: 15, birth_month: 3 },
    { full_name: "Tomáš", email: "t@x.cz", birth_day: 1, birth_month: 7 },
    { full_name: "", email: "bez-jmena@x.cz", birth_day: null, birth_month: null },
  ];

  it("dnešní napřed, pak zítřejší, ostatní vůbec", () => {
    assert.deepEqual(upcomingBirthdays(people, "2026-03-15"), [
      { name: "Jana", when: "dnes" },
      { name: "Petr", when: "zítra" },
    ]);
  });

  it("zítra přes přelom měsíce i roku", () => {
    assert.deepEqual(
      upcomingBirthdays([{ full_name: "Nový rok", email: "n@x.cz", birth_day: 1, birth_month: 1 }], "2026-12-31"),
      [{ name: "Nový rok", when: "zítra" }],
    );
  });

  it("chybějící sloupce před migrací nevadí", () => {
    assert.deepEqual(upcomingBirthdays([{ full_name: "Petr", email: "p@x.cz" }], "2026-03-15"), []);
  });
});

describe("composeVision", () => {
  it("každá odpověď jako odstavec, prázdné vynechá", () => {
    assert.equal(
      composeVision(["  Chci spát v klidu. ", "", "Protože pak funguju."]),
      "Chci spát v klidu.\n\nProtože pak funguju.",
    );
  });

  it("nic nevyplněno dá prázdnou vizi", () => {
    assert.equal(composeVision(["", " "]), "");
  });
});
