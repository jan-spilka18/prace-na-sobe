import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

/** Přihlášený profil, nebo null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
}

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

/**
 * Klient pořád používá heslo, které mu vygeneroval admin.
 *
 * Příznak žije v user_metadata, ne v tabulce profiles — nastavuje ho jediné
 * místo (založení účtu a reset hesla) a maže ho jediné místo (změna hesla),
 * takže kvůli němu nemusela vzniknout migrace.
 */
export async function usesAdminPassword(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.user_metadata?.password_set_by_admin === true;
}
