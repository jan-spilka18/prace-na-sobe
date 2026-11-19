import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { filledSections, sessionHeading } from "@/lib/sessionTemplate";
import { refineTasks } from "@/lib/sessionTasks";
import { FeedbackForm } from "@/components/session/FeedbackForm";
import { SessionArticle } from "@/components/session/SessionArticle";
import { FeedbackJump } from "@/components/session/FeedbackJump";

export default async function ClientSessionPage({
  params,
  searchParams,
}: PageProps<"/sezeni/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;
  // Klik na číslo v e-mailu se zápisem: /sezeni/…?hodnoceni=8#zpetna-vazba
  const raw = Number((await searchParams).hodnoceni);
  const initialRating = Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : null;

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

  // Úkoly se vyhodnotí i při zobrazení, ne jen při uložení — starší
  // zápisy tak vypadají správně, aniž by je Honza musel uložit znovu.
  const sections = filledSections(refineTasks(session.content ?? {}));
  const order = (all ?? []).findIndex((row) => row.id === session.id) + 1;
  const heading = sessionHeading(session.session_date, session.kind, order);

  return (
    <Screen
      title={heading.title}
      subtitle={heading.subtitle}
      back={{ href: "/sezeni", label: "Sezení" }}
    >
      <div className="space-y-5">
        {/*
          Zkratka ke zpětné vazbě jen dokud ji klient nenapsal. Pak by
          jen strkala dolů k něčemu, co už je hotové.
        */}
        {!feedback && sections.length > 0 && <FeedbackJump />}

        {sections.length === 0 ? (
          <p className="rounded-group bg-surface px-4 py-6 text-center text-[15px] text-ink-600">
            Zápis je zatím prázdný.
          </p>
        ) : (
          <SessionArticle sections={sections} />
        )}

        <FeedbackForm
          sessionId={session.id}
          feedback={feedback ?? null}
          initialRating={initialRating}
        />
      </div>
    </Screen>
  );
}
