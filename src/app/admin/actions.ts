"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generatePassword } from "@/lib/password";
import { cleanPhone } from "@/lib/profile";
import {
  DEFAULT_PROGRAM_DURATION_DAYS,
  DEFAULT_PROGRAM_TITLE,
  MIN_PASSWORD_LENGTH,
} from "@/lib/config";

export type CreateClientState = {
  error?: string;
  created?: { fullName: string; email: string; password: string };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createClientAccount(
  _prev: CreateClientState,
  formData: FormData,
): Promise<CreateClientState> {
  // Akce sahá na servisní klíč, takže se role ověřuje jako první.
  await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const startDate = String(formData.get("start_date") ?? "").trim();
  const durationRaw = String(formData.get("duration_days") ?? "");
  const durationDays = Number(durationRaw) || DEFAULT_PROGRAM_DURATION_DAYS;

  if (!fullName) return { error: "Vyplň jméno klienta." };
  if (!email.includes("@")) return { error: "E-mail nevypadá platně." };
  if (!ISO_DATE.test(startDate)) return { error: "Vyber datum začátku programu." };
  if (durationDays < 1 || durationDays > 3650) {
    return { error: "Délka programu musí být mezi 1 a 3650 dny." };
  }

  const admin = createAdminClient();
  const password = generatePassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "client" },
  });

  if (createError || !created.user) {
    const alreadyExists =
      createError?.message?.toLowerCase().includes("already") ?? false;
    return {
      error: alreadyExists
        ? "Účet s tímhle e-mailem už existuje."
        : `Účet se nepodařilo založit: ${createError?.message ?? "neznámá chyba"}`,
    };
  }

  const { error: programError } = await admin.from("programs").insert({
    client_id: created.user.id,
    title: DEFAULT_PROGRAM_TITLE,
    start_date: startDate,
    duration_days: durationDays,
  });

  if (programError) {
    // Účet bez programu by zůstal viset jako mrtvá schránka.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: `Program se nepodařilo založit: ${programError.message}` };
  }

  revalidatePath("/admin");
  return { created: { fullName, email, password } };
}

/*
  Přihlašovací údaje a telefon klienta spravuje jen admin. Klient je vidí
  v Nastavení, ale změnit je nemůže — databáze mu změnu e-mailu a telefonu
  v profilu nepustí (migrace 0008) a heslo si měnit nemá kde.

  Obě akce sahají na servisní klíč, takže role se ověřuje jako první a cíl
  musí být klient — admin si přes ně omylem nepřepíše vlastní účet.
*/

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function clientProfile(clientId: string) {
  if (!clientId) return null;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("id, role, email, phone")
    .eq("id", clientId)
    .single();
  return data?.role === "client" ? data : null;
}

export type ContactState = { error?: string; saved?: boolean };

export async function updateClientContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  await requireAdmin();

  const client = await clientProfile(String(formData.get("client_id") ?? ""));
  if (!client) return { error: "Klient nenalezen." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "E-mail nevypadá platně." };

  const phone = cleanPhone(String(formData.get("phone") ?? ""));
  if (!phone.ok) return { error: phone.error };

  const admin = createAdminClient();
  const emailChanged = email !== client.email;

  // Přihlašovací e-mail žije v Supabase Auth, profil drží jeho kopii pro
  // přehledy. Mění se oba, Auth první: když neprojde (e-mail už má jiný
  // účet), profil zůstane, jak byl.
  if (emailChanged) {
    const { error } = await admin.auth.admin.updateUserById(client.id, {
      email,
      // Bez potvrzovacího e-mailu: změnu dělá admin, ne cizí člověk.
      email_confirm: true,
    });
    if (error) return { error: describeAuthError(error, "E-mail") };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ email, phone: phone.phone })
    .eq("id", client.id);

  if (profileError) {
    // Ať se přihlašovací e-mail a ten v profilu nerozejdou.
    if (emailChanged) {
      await admin.auth.admin.updateUserById(client.id, {
        email: client.email,
        email_confirm: true,
      });
    }
    return { error: `Uložení selhalo: ${profileError.message}` };
  }

  revalidatePath("/", "layout");
  return { saved: true };
}

export type PasswordState = { error?: string; password?: string };

/**
 * Nastaví klientovi nové heslo — zadané, nebo vygenerované, když admin
 * pole nechá prázdné. Staré heslo tím přestane platit.
 */
export async function setClientPassword(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  await requireAdmin();

  const client = await clientProfile(String(formData.get("client_id") ?? ""));
  if (!client) return { error: "Klient nenalezen." };

  const typed = String(formData.get("password") ?? "").trim();
  if (typed !== "" && typed.length < MIN_PASSWORD_LENGTH) {
    return { error: `Heslo musí mít aspoň ${MIN_PASSWORD_LENGTH} znaků.` };
  }
  const password = typed || generatePassword();

  const { error } = await createAdminClient().auth.admin.updateUserById(
    client.id,
    { password },
  );
  if (error) return { error: describeAuthError(error, "Heslo") };

  return { password };
}

function describeAuthError(
  error: { code?: string; message: string },
  what: "E-mail" | "Heslo",
): string {
  switch (error.code) {
    case "email_exists":
      return "Tenhle e-mail už má jiný účet.";
    case "email_address_invalid":
      return "Tenhle e-mail Supabase nepřijme.";
    case "weak_password":
      return "Tohle heslo je moc slabé. Zkus delší nebo míň obvyklé.";
    default:
      if (error.message.toLowerCase().includes("already")) {
        return "Tenhle e-mail už má jiný účet.";
      }
      return `${what} se nepodařilo změnit: ${error.message}`;
  }
}

export type DeleteClientState = { error?: string };

export async function deleteClientAccount(
  _prev: DeleteClientState,
  formData: FormData,
): Promise<DeleteClientState> {
  await requireAdmin();

  const clientId = String(formData.get("client_id") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!clientId) return { error: "Chybí klient." };
  if (confirmation !== "SMAZAT") {
    return { error: "Pro potvrzení napiš SMAZAT." };
  }

  const admin = createAdminClient();

  // Smazání účtu spustí kaskádu přes profiles na všechna data klienta.
  const { error } = await admin.auth.admin.deleteUser(clientId);
  if (error) return { error: `Smazání selhalo: ${error.message}` };

  revalidatePath("/admin");
  return {};
}

export type ProgramState = { error?: string; saved?: boolean };

export async function updateProgram(
  _prev: ProgramState,
  formData: FormData,
): Promise<ProgramState> {
  await requireAdmin();

  const programId = String(formData.get("program_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "").trim();
  const durationDays = Number(formData.get("duration_days"));

  if (!programId) return { error: "Chybí program." };
  if (!ISO_DATE.test(startDate)) return { error: "Datum začátku nevypadá platně." };
  if (!durationDays || durationDays < 1 || durationDays > 3650) {
    return { error: "Délka programu musí být mezi 1 a 3650 dny." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ start_date: startDate, duration_days: durationDays })
    .eq("id", programId);

  if (error) return { error: `Uložení selhalo: ${error.message}` };

  revalidatePath("/admin");
  return { saved: true };
}
