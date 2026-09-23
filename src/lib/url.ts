/**
 * Odkaz, který se dá bezpečně dát do href.
 *
 * Pustí jen http a https. Bez téhle kontroly projde `javascript:…`, což je
 * spustitelný kód schovaný za odkaz: klient si ho uloží k návyku a spustí
 * se ve chvíli, kdy na něj v adminu klikne Honza — tedy v relaci, která
 * vidí všechny klienty.
 *
 * Vrací null pro prázdný i nepřijatelný vstup, takže volající nemusí
 * rozlišovat „nevyplněno" a „nepovolené".
 */
export function safeUrl(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") return null;

  // Bez schématu bere URL() vstup jako neplatný, ne jako relativní adresu.
  // „youtube.com/watch" je ale to, co člověk do políčka reálně vloží.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (parsed.hostname === "") return null;

  return parsed.toString();
}
