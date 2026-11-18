import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import {
  formatCzechDate,
  formatCzechDayMonth,
  formatCzechWeekday,
  todayISO,
} from "@/lib/date";
import {
  SESSION_KIND_LABELS,
  filledSections,
  sessionTopics,
} from "@/lib/sessionTemplate";
import { FeedbackForm } from "./FeedbackForm";
import { SessionArticle } from "./SessionArticle";

export default async function ClientSessionPage({
  params,
}: PageProps<"/sezeni/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;

  const supabase = await createClient();

  // Koncept se sem nedostane — politika v databázi ho klientovi nevydá.
  // Zpětná vazba a pořadí sezení se načítají souběžně se zápisem.
  const [{ data: session }, { data: feedback }, { data: all }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .eq("client_id", profile.id)
        .maybeSingle(),
      supabase
        .from("session_feedback")
        .select("*")
        .eq("session_id", id)
        .maybeSingle(),
      supabase
        .from("sessions")
        .select("id")
        .eq("client_id", profile.id)
        .order("session_date", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);

  if (!session) notFound();

  const sections = filledSections(session.content ?? {});
  const order = (all ?? []).findIndex((row) => row.id === session.id) + 1;

  return (
    <Screen
      title={sessionTitle(session.session_date)}
      subtitle={[
        SESSION_KIND_LABELS[session.kind],
        order > 0 ? `${order}. sezení` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      back={{ href: "/sezeni", label: "Sezení" }}
    >
      <div className="space-y-5">
        {/*
          Zkratka ke zpětné vazbě jen dokud ji klient nenapsal. Pak by
          jen strkala dolů k něčemu, co už je hotové.
        */}
        {!feedback && sections.length > 0 && (
          <a
            href="#zpetna-vazba"
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-night px-4 text-[14px] font-semibold text-white transition-opacity active:opacity-70"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M6 13l6 6 6-6" />
            </svg>
            Co si odnášíš? Napiš Honzovi
          </a>
        )}

        {sections.length === 0 ? (
          <p className="rounded-group bg-surface px-4 py-6 text-center text-[15px] text-ink-600">
            Zápis je zatím prázdný.
          </p>
        ) : (
          <SessionArticle sections={sections} />
        )}

        <FeedbackForm
          sessionId={session.id}
          topics={sessionTopics(session.content)}
          feedback={feedback ?? null}
        />
      </div>
    </Screen>
  );
}

/** „Středa 18. listopadu" — rok jen u sezení z jiného roku. */
function sessionTitle(date: string): string {
  if (date.slice(0, 4) !== todayISO().slice(0, 4)) return formatCzechDate(date);
  const weekday = formatCzechWeekday(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatCzechDayMonth(date)}`;
}
