import { requireProfile } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Změna hesla" };

export default async function ChangePasswordPage() {
  const profile = await requireProfile();
  const back =
    profile.role === "admin"
      ? { href: "/admin", label: "Klienti" }
      : { href: "/nastaveni", label: "Nastavení" };

  return (
    <Screen title="Změna hesla" subtitle={profile.email} back={back}>
      <ChangePasswordForm />
    </Screen>
  );
}
