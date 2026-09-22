import { requireAdmin } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { NewClientForm } from "./NewClientForm";
import { todayISO } from "@/lib/date";

export const metadata = { title: "Nový klient" };

export default async function NewClientPage() {
  await requireAdmin();

  return (
    <Screen
      title="Nový klient"
      subtitle="Založí účet i program. Heslo uvidíš jen jednou."
      back={{ href: "/admin", label: "Klienti" }}
    >
      <NewClientForm today={todayISO()} />
    </Screen>
  );
}
