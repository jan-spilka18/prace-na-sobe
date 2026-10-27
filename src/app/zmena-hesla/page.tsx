import { requireAdmin } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Změna hesla" };

export default async function ChangePasswordPage() {
  // Vlastní heslo si mění jen admin. Klientům ho nastavuje on v jejich
  // detailu; klienta requireAdmin pošle zpátky na úvodní obrazovku.
  const profile = await requireAdmin();
  const back = { href: "/admin", label: "Klienti" };

  return (
    <Screen title="Změna hesla" subtitle={profile.email} back={back}>
      <ChangePasswordForm />
    </Screen>
  );
}
