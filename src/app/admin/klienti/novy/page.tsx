import { requireAdmin } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { NewClientForm } from "./NewClientForm";
import { todayISO } from "@/lib/date";
import { emailConfigured } from "@/lib/email";

export const metadata = { title: "Nový klient" };

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <Screen
      eyebrow="Účet i program najednou"
      title="Nový klient"
      back={{ href: "/admin", label: "Klienti" }}
    >
      <NewClientForm today={todayISO()} emailReady={emailConfigured()} />
    </Screen>
  );
}
