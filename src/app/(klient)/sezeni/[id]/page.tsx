import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Markdown } from "@/components/Markdown";
import { formatCzechDate, formatCzechWeekday } from "@/lib/date";
import { SESSION_KIND_LABELS, filledSections } from "@/lib/sessionTemplate";
import { FeedbackForm } from "./FeedbackForm";

export default async function ClientSessionPage({
  params,
}: PageProps<"/sezeni/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;

  const supabase = await createClient();

  // Koncept se sem nedostane — politika v databázi ho klientovi nevydá.
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .eq("client_id", profile.id)
    .maybeSingle();

  if (!session) notFound();

  const { data: feedback } = await supabase
    .from("session_feedback")
    .select("*")
    .eq("session_id", id)
    .maybeSingle();

  const sections = filledSections(session.content ?? {});

  return (
    <Screen
      title={formatCzechDate(session.session_date)}
      subtitle={`${SESSION_KIND_LABELS[session.kind]} · ${formatCzechWeekday(session.session_date)}`}
      back={{ href: "/sezeni", label: "Sezení" }}
    >
      <div className="space-y-5">
        {sections.length === 0 ? (
          <p className="rounded-group bg-surface px-4 py-6 text-center text-[15px] text-ink-600">
            Zápis je zatím prázdný.
          </p>
        ) : (
          sections.map((section) => (
            <section key={section.key} className="rounded-group bg-surface p-4">
              <h2 className="font-display text-[19px] font-semibold text-ink">
                {section.title}
              </h2>
              <Markdown source={section.body} className="mt-2.5" />
            </section>
          ))
        )}

        <FeedbackForm sessionId={session.id} feedback={feedback ?? null} />
      </div>
    </Screen>
  );
}
