import type { NextRequest } from "next/server";

/**
 * Ověří, že naplánovanou úlohu spustil někdo oprávněný.
 *
 * Adresa /api/cron/* je veřejná — kdokoli ji zná, může ji zavolat. Bez téhle
 * kontroly by cizí člověk mohl klientům posílat notifikace, kdy se mu zachce.
 *
 * Vercel k vlastním cronům přidává hlavičku s tajemstvím z CRON_SECRET,
 * takže stejná proměnná pokrývá i externí plánovač.
 */
export function cronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // Bez nastaveného tajemství se úloha nespustí vůbec. Otevřený endpoint
  // je horší než nefunkční notifikace.
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Externí plánovače často neumí vlastní hlavičky.
  return request.nextUrl.searchParams.get("klic") === secret;
}
