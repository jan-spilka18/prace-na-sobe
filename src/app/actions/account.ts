"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/config";

export type ChangePasswordState = { error?: string; ok?: boolean };

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const profile = await requireProfile();

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!current || !next) return { error: "Vyplň staré i nové heslo." };
  if (next.length < MIN_PASSWORD_LENGTH) {
    return { error: `Nové heslo musí mít aspoň ${MIN_PASSWORD_LENGTH} znaků.` };
  }
  if (next !== confirm) return { error: "Nová hesla se neshodují." };
  if (next === current) return { error: "Nové heslo je stejné jako to staré." };

  const supabase = await createClient();

  /*
    Supabase u změny hesla staré heslo nevyžaduje — stačí platná session.
    Kdo se dostane k odemčenému telefonu, může majiteli změnit heslo a zamknout
    ho ven. Proto se staré heslo ověřuje přihlášením; je to jediný způsob,
    jak ho přes klientskou knihovnu zkontrolovat.
  */
  const { error: wrongCurrent } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: current,
  });
  if (wrongCurrent) return { error: "Současné heslo nesedí." };

  const { error } = await supabase.auth.updateUser({
    password: next,
    // Shodí varování „pořád máš heslo od Honzy". Nikde jinde se nenastavuje,
    // takže ho zpátky zapne jen admin resetem hesla.
    data: { password_set_by_admin: false },
  });

  if (error) {
    return { error: describeUpdateError(error) };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

function describeUpdateError(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "weak_password":
      return "Tohle heslo je moc slabé. Zkus delší nebo míň obvyklé.";
    case "same_password":
      return "Nové heslo je stejné jako to staré.";
    case "over_request_rate_limit":
      return "Moc pokusů za sebou. Zkus to za chvíli.";
    default:
      return `Heslo se nepodařilo změnit: ${error.message}`;
  }
}
