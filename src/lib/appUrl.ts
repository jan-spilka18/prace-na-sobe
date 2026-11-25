import { headers } from "next/headers";

/** Adresa aplikace pro odkazy v e-mailech, bez lomítka na konci. */
export async function appUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "prace-na-sobe.vercel.app";
  const proto = list.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}
