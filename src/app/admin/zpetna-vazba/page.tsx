import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";
import { summarizeFeedback } from "@/lib/feedbackOverview";
import { FeedbackView } from "./FeedbackView";

export const metadata = { title: "Zpětná vazba" };

/**
 * Všechna zpětná vazba od klientů na jednom místě, nejnovější nahoře.
 * Dá se zúžit na jednoho klienta (?klient=id) — odkazuje sem i jeho detail.
 */
export default async function FeedbackPage({
  searchParams,
}: PageProps<"/admin/zpetna-vazba">) {
  await requireAdmin();
  const { klient } = await searchParams;
  const clientFilter = typeof klient === "string" ? klient : null;

  const supabase = await createClient();
  const [{ data: feedback }, { data: clients }] = await Promise.all([
    supabase
      .from("session_feedback")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, email").eq("role", "client"),
  ]);

  const all = feedback ?? [];
  const sessionIds = [...new Set(all.map((row) => row.session_id))];
  const { data: sessions } =
    sessionIds.length === 0
      ? { data: [] }
      : await supabase
          .from("sessions")
          .select("id, session_date, kind, client_id")
          .in("id", sessionIds);

  const sessionById = new Map((sessions ?? []).map((s) => [s.id, s]));
  const nameById = new Map(
    (clients ?? []).map((c) => [c.id, c.full_name || c.email]),
  );

  const rows = all.filter((row) => !clientFilter || row.client_id === clientFilter);
  const summary = summarizeFeedback(rows, todayISO());

  // Filtr nabízí jen klienty, kteří už něco poslali.
  const filterClients = [...new Set(all.map((row) => row.client_id))]
    .map((id) => ({ id, name: nameById.get(id) ?? "Klient" }))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  return (
    <FeedbackView
      rows={rows}
      total={all.length}
      sessionById={sessionById}
      nameById={nameById}
      filterClients={filterClients}
      clientFilter={clientFilter}
      summary={summary}
    />
  );
}
