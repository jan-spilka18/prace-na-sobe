"use server";

import { requireAdmin } from "@/lib/auth";

export type VapidKeys = {
  error?: string;
  publicKey?: string;
  privateKey?: string;
  secret?: string;
};

/**
 * Vygeneruje klíče pro push notifikace.
 *
 * Klíče se nikam neukládají — jen se jednou ukážou na obrazovce, aby se daly
 * přenést do Vercelu. Do databáze ani do repozitáře nepatří: kdo má soukromý
 * klíč, může posílat notifikace jménem téhle aplikace.
 */
export async function generateVapidKeys(): Promise<VapidKeys> {
  await requireAdmin();

  try {
    const webpush = (await import("web-push")).default;
    const { publicKey, privateKey } = webpush.generateVAPIDKeys();

    // Tajemství pro naplánované úlohy. Generuje se tu spolu s klíči,
    // protože se vyplňuje do stejného formuláře ve Vercelu.
    const { randomBytes } = await import("node:crypto");
    const secret = randomBytes(24).toString("base64url");

    return { publicKey, privateKey, secret };
  } catch (error) {
    return { error: `Klíče se nepodařilo vygenerovat: ${(error as Error).message}` };
  }
}
