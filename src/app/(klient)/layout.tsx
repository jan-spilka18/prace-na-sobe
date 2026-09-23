import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";
import { ServiceWorker } from "@/components/ServiceWorker";

export default async function ClientLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");
  // Nový klient jde nejdřív průvodcem. Přísně na true: před spuštěním
  // migrace sloupec chybí, hodnota je undefined a nikoho nepřesměruje.
  if (profile.onboarding_pending === true) redirect("/vitej");

  return (
    <>
      {children}
      <TabBar />
      <ServiceWorker />
    </>
  );
}
