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
    return { error: describeSignInError(error) };
  }

  revalidatePath("/", "layout");
  // Otevřený redirect: povolíme jen cestu v rámci aplikace.
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

/*
  Špatné heslo je jediný případ, kdy se odpověď schválně drží vágní: kdyby
  aplikace rozlišovala „neznámý e-mail" a „špatné heslo", dal by se přes ni
  zjistit, kdo je Honzovým klientem.

  Zbytek chyb ale s přihlašovacími údaji nesouvisí — je to nepotvrzený účet
  nebo špatně nastavený projekt. Schovávat je za stejnou hlášku znamená
  hledat překlep v hesle, když je ve skutečnosti chyba v konfiguraci.
*/
function describeSignInError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "E-mail nebo heslo nesedí.";
    case "email_not_confirmed":
      return "Účet nemá potvrzený e-mail. V Supabase u něj zaškrtni Auto Confirm User.";
    case "user_banned":
      return "Účet je zablokovaný.";
    case "over_request_rate_limit":
      return "Moc pokusů za sebou. Zkus to za chvíli.";
    default:
      return `Přihlášení selhalo: ${error.message}`;
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/prihlaseni");
}
