import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { TabBar } from "@/components/ui/TabBar";

export default async function ClientLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();
  if (profile.role === "admin") redirect("/admin");

  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
