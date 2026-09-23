import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { NotesSection } from "./NotesSection";
import { LinksSection } from "./LinksSection";

export const metadata = { title: "Soukromé" };

export default async function PrivateSpacePage({
  params,
}: PageProps<"/admin/klienti/[id]/soukrome">) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();

  const { data: client } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: notes }, { data: links }] = await Promise.all([
    supabase
      .from("client_notes")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_links")
      .select("*")
      .eq("client_id", id)
      .order("position", { ascending: true }),
  ]);

  return (
    <Screen
      title="Soukromé"
      subtitle={client.full_name || client.email}
      back={{ href: `/admin/klienti/${id}`, label: "Klient" }}
    >
      <div className="space-y-5">
        <NotesSection clientId={id} notes={notes ?? []} />
        <LinksSection clientId={id} links={links ?? []} />
      </div>
    </Screen>
  );
}
