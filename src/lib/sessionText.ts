/*
  Drobnosti pro čtení vloženého zápisu: srovnání popisků a česká data.
  Sdílí je rozřazení (sessionSort.ts) i rozbor úkolů (sessionTasks.ts).
*/

/** Malá písmena, bez diakritiky, bez ozdob nadpisu a koncové dvojtečky. */
export function plainLabel(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[#\s]+/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\*\*|__/g, "")
    .replace(/[:*\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** „12.11.2026", „12. 11. 2026" nebo „2026-11-12" → ISO datum. */
export function parseCzechDate(value: string): string | undefined {
  const czech = value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  const [y, m, d] = czech
    ? [Number(czech[3]), Number(czech[2]), Number(czech[1])]
    : iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : [0, 0, 0];
  if (!y) return undefined;

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
