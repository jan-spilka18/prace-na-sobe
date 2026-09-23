"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cleanPhone, validBirthday } from "@/lib/profile";

export type ProfileResult = { error?: string; ok?: boolean };

/**
 * Chyba, když kód běží dřív, než se v Supabase pustila migrace 0007.
 *
 * Bez překladu by klient viděl „Could not find the 'phone' column" a
 * nevěděl by, co s tím. Takhle se aspoň dozví, že to není jeho chyba.
 */
function describeDbError(error: { code?: string; message: string }): string {
  if (error.code === "PGRST204" || error.code === "42703") {
    return "Aplikace čeká na aktualizaci databáze. Dej vědět Honzovi.";
  }
  return error.message;
}

export async function saveProfile(input: {
  fullName: string;
  phone: string;
  birthDay: number | null;
  birthMonth: number | null;
}): Promise<ProfileResult> {
  const profile = await requireProfile();

  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName === "") return { error: "Vyplň své jméno." };
  if (fullName.length > 120) return { error: "Jméno je nějak dlouhé." };

  const phone = cleanPhone(input.phone);
  if (!phone.ok) return { error: phone.error };

  if (!validBirthday(input.birthDay, input.birthMonth)) {
    return { error: "Narozeniny potřebují den i měsíc, a ten den musí existovat." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone.phone,
      birth_day: input.birthDay,
      birth_month: input.birthMonth,
    })
    .eq("id", profile.id);

  if (error) return { error: describeDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Konec průvodce — dokončený i zavřený.
 *
 * Obojí znamená „už mi ho neukazuj". Rozlišovat je nemá smysl: kdo průvodce
 * zavřel, neudělal chybu, jen ho nepotřeboval.
 */
export async function finishOnboarding(): Promise<ProfileResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_pending: false, onboarded_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) return { error: describeDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Admin pošle klienta průvodcem znovu — třeba když si ho chce sám vyzkoušet. */
export async function resetOnboarding(clientId: string): Promise<ProfileResult> {
  await requireAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_pending: true, onboarded_at: null })
    .eq("id", clientId);

  if (error) return { error: describeDbError(error) };

  revalidatePath("/", "layout");
  return { ok: true };
}
