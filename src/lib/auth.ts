import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

/*
  Ověření přihlášení jednou za požadavek.

  getUser() se ptá Supabase po síti. Dřív ho volal layout, stránka i kontrola
  hesla zvlášť — jedno otevření obrazovky tak čekalo na tři stejné odpovědi
  za sebou. cache() z Reactu je spojí do jedné: v rámci jednoho vykreslení
  se výsledek sdílí, další požadavek se ptá znovu.
*/
const currentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Přihlášený profil, nebo null. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/prihlaseni");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}
