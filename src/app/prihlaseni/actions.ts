"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error?: string };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("dal") ?? "/");

  if (!email || !password) {
    return { error: "Vyplň e-mail i heslo." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Nerozlišujeme „neznámý e-mail" a „špatné heslo" — jinak by šlo
    // zjistit, kdo je v aplikaci klientem.
    return { error: "E-mail nebo heslo nesedí." };
  }

  revalidatePath("/", "layout");
  // Otevřený redirect: povolíme jen cestu v rámci aplikace.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/prihlaseni");
}
