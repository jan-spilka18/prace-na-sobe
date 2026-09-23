/*
  Vzhled aplikace: podle telefonu, světlý, nebo tmavý.

  Volba se ukládá do cookie, ne do účtu. Na mobilu může člověk chtít tmavý
  režim a na notebooku světlý — je to nastavení zařízení, ne člověka.
  Cookie (a ne localStorage) proto, že ji přečte server a stránka přijde
  rovnou ve správných barvách, bez bliknutí bílé při načtení.
*/

export const THEME_COOKIE = "vzhled";

export type Theme = "auto" | "light" | "dark";

export const THEMES: { value: Theme; label: string }[] = [
  { value: "auto", label: "Podle telefonu" },
  { value: "light", label: "Světlý" },
  { value: "dark", label: "Tmavý" },
];

export function parseTheme(value: string | undefined): Theme {
  return value === "light" || value === "dark" ? value : "auto";
}
