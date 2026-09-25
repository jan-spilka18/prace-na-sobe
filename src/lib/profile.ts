import { addDays } from "@/lib/date";

/*
  Profil klienta: telefon, narozeniny a vize složená z odpovědí v průvodci.
*/

const MONTHS_GENITIVE = [
  "ledna", "února", "března", "dubna", "května", "června",
  "července", "srpna", "září", "října", "listopadu", "prosince",
];

export const MONTH_NAMES = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

/** Kolik dní má měsíc bez znalosti roku. Únor 29 — narozeniny 29. 2. existují. */
export function daysInMonth(month: number): number {
  if (month === 2) return 29;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function validBirthday(day: number | null, month: number | null): boolean {
  if (day === null && month === null) return true;
  if (day === null || month === null) return false;
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(month);
}

/** „15. března". */
export function formatBirthday(day: number, month: number): string {
  return `${day}. ${MONTHS_GENITIVE[month - 1]}`;
}

export type PhoneResult =
  | { ok: true; phone: string | null }
  | { ok: false; error: string };

/**
 * Telefon, jak ho člověk napíše, jen uklizený.
 *
 * Nepřevádí se do jednoho formátu: „777 123 456" i „+420 777 123 456" jsou
 * pro Honzu stejně čitelné a přepisovat mu, co klient napsal, nic nepřináší.
 * Hlídá se jen, že jde opravdu o číslo.
 */
export function cleanPhone(raw: string): PhoneResult {
  const phone = raw.trim().replace(/\s+/g, " ");
  if (phone === "") return { ok: true, phone: null };

  if (!/^\+?[\d\s()-]+$/.test(phone)) {
    return { ok: false, error: "Telefon může obsahovat jen čísla, mezery a +." };
  }

  const digits = phone.replace(/\D/g, "").length;
  if (digits < 9 || digits > 15) {
    return { ok: false, error: "Telefon nevypadá úplně. Zkontroluj počet číslic." };
  }

  return { ok: true, phone };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Má člověk v daný den narozeniny?
 *
 * Kdo se narodil 29. února, slaví v nepřestupném roce 28. února — jinak
 * by mu Honza tři roky ze čtyř nepopřál.
 */
export function hasBirthdayOn(
  birth: { birth_day: number | null; birth_month: number | null },
  isoDate: string,
): boolean {
  if (birth.birth_day === null || birth.birth_month === null) return false;

  const [year, month, day] = isoDate.split("-").map(Number);

  if (birth.birth_month === 2 && birth.birth_day === 29 && !isLeapYear(year)) {
    return month === 2 && day === 28;
  }

  return month === birth.birth_month && day === birth.birth_day;
}

export type BirthdayNotice = { name: string; when: "dnes" | "zítra" };

/** Kdo má narozeniny dnes a kdo zítra — do ranního přehledu. */
export function upcomingBirthdays(
  people: Array<{
    full_name: string;
    email: string;
    birth_day?: number | null;
    birth_month?: number | null;
  }>,
  today: string,
): BirthdayNotice[] {
  const tomorrow = addDays(today, 1);
  const notices: BirthdayNotice[] = [];

  for (const person of people) {
    // Před spuštěním migrace sloupce chybí; undefined bereme jako nevyplněno.
    const birth = {
      birth_day: person.birth_day ?? null,
      birth_month: person.birth_month ?? null,
    };
    const name = person.full_name || person.email;
    if (hasBirthdayOn(birth, today)) notices.push({ name, when: "dnes" });
    else if (hasBirthdayOn(birth, tomorrow)) notices.push({ name, when: "zítra" });
  }

  // Dnešní napřed — na ty se reaguje hned.
  return notices.sort((a, b) => (a.when === b.when ? 0 : a.when === "dnes" ? -1 : 1));
}

/**
 * Vize složená z odpovědí na tři otázky průvodce.
 *
 * Každá odpověď je vlastní odstavec. První se na Přehledu vykreslí velkým
 * výrazným písmem, takže odpověď na „Kde chceš být za 90 dní?" se stane hlavní
 * větou vize a zbytek ji vysvětluje.
 */
export function composeVision(answers: string[]): string {
  return answers
    .map((answer) => answer.trim())
    .filter((answer) => answer !== "")
    .join("\n\n");
}
