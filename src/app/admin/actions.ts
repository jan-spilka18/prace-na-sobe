"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { generatePassword } from "@/lib/password";
import {
  DEFAULT_PROGRAM_DURATION_DAYS,
  DEFAULT_PROGRAM_TITLE,
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

export type ResetPasswordState = { error?: string; password?: string };

export async function resetClientPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  await requireAdmin();

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Chybí klient." };

  const admin = createAdminClient();
  const password = generatePassword();

  const { error } = await admin.auth.admin.updateUserById(clientId, { password });
  if (error) return { error: `Heslo se nepodařilo změnit: ${error.message}` };

  return { password };
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
