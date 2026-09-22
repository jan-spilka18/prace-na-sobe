/*
  Adresa projektu se do nastavení opisuje ručně a snadno se do ní dostane
  i něco navíc — lomítko na konci nebo rovnou cesta `/rest/v1`, protože
  Supabase ji na stránce s nastavením ukazuje i v téhle podobě.

  Knihovna si za adresu lepí vlastní cesty, takže by z toho vzniklo
  `/rest/v1/auth/v1/token` a server odpoví „Invalid path specified in
  request URL". Chyba přitom vypadá jako problém s heslem, ne s nastavením.

  Proto se z adresy bere jen schéma a doména.
*/
export function supabaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();

  if (!raw) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_URL. Doplň ji v nastavení projektu na Vercelu.",
    );
  }

  return normalizeSupabaseUrl(raw);
}

export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const { protocol, host } = new URL(withScheme);
    return `${protocol}//${host}`;
  } catch {
    // Nečitelnou adresu nemá smysl hádat — ať selže na volání, ne tady.
    return trimmed.replace(/\/+$/, "");
  }
}

export function supabaseAnonKey(): string {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!key) {
    throw new Error(
      "Chybí NEXT_PUBLIC_SUPABASE_ANON_KEY. Doplň ji v nastavení projektu na Vercelu.",
    );
  }

  return key;
}
