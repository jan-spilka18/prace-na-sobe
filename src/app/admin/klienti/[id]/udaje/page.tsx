import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { ContactForm, PasswordForm } from "./CredentialsForms";

export const metadata = { title: "Přihlašovací údaje" };

/**
 * E-mail, telefon a heslo klienta. Mění je jen admin — klient je
 * v Nastavení jen vidí.
 */
export default async function CredentialsPage({
  params,
}: PageProps<"/admin/klienti/[id]/udaje">) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("profiles")
    // Hvězdička, ne výčet: telefon přibyl migrací 0007 a výčet by před
    // jejím spuštěním spadl na neexistujícím sloupci.
    .select("*")
    .eq("id", id)
    .eq("role", "client")
    .maybeSingle();

  if (!client) notFound();

  return (
    <Screen
      title="Přihlašovací údaje"
      subtitle={client.full_name || client.email}
      back={{ href: `/admin/klienti/${id}`, label: "Klient" }}
    >
      <div className="space-y-6">
        <ContactForm
          clientId={id}
          email={client.email}
          phone={client.phone ?? ""}
        />
        <PasswordForm clientId={id} />
      </div>
    </Screen>
  );
}
