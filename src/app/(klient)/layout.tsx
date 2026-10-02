import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AppBadge } from "@/components/AppBadge";
import { createClient } from "@/lib/supabase/server";
import { waitingFeedbackCount } from "@/lib/queries";

export default async function ClientLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");
  // Nový klient jde nejdřív průvodcem. Přísně na true: před spuštěním
  // migrace sloupec chybí, hodnota je undefined a nikoho nepřesměruje.
  if (profile.onboarding_pending === true) redirect("/vitej");

  // Bublinka na záložce Sezení. Drží se, dokud klient vazbu nevyplní —
  // uložení volá revalidatePath nad celým rozvržením, takže pak zmizí sama.
  const waiting = await waitingFeedbackCount(await createClient(), profile.id);

  return (
    <>
      {children}
      <TabBar badges={{ "/sezeni": waiting }} />
      <AppBadge count={waiting} />
      <ServiceWorker />
    </>
  );
}
