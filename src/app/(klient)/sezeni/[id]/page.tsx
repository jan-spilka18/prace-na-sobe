import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Screen } from "@/components/ui/Screen";
import { Markdown } from "@/components/Markdown";
import { formatCzechDate, formatCzechWeekday } from "@/lib/date";
import { SESSION_KIND_LABELS, filledSections } from "@/lib/sessionTemplate";
import { FeedbackForm } from "./FeedbackForm";

/** Sekce, která se vykreslí žlutě — je to jediná část zápisu, podle které se jedná. */
const HIGHLIGHT_SECTION = "tasks";

export default async function ClientSessionPage({
  params,
}: PageProps<"/sezeni/[id]">) {
  const profile = await requireProfile();
  const { id } = await params;

  const supabase = await createClient();

  // Koncept se sem nedostane — politika v databázi ho klientovi nevydá.
  // Zpětná vazba se načítá souběžně se zápisem; obojí zná jen id z adresy.
  const [{ data: session }, { data: feedback }] = await Promise.all([
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
  ]);

  if (!session) notFound();

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
          <>
            {/*
              Jeden souvislý text s mezinadpisy, ne pět samostatných karet.
              Zápis je souvislá úvaha o jednom sezení; rozřezaný na kartičky
              se četl jako formulář.
            */}
            <article className="space-y-5 rounded-group bg-surface p-5">
              {sections.map((section, index) =>
                section.key === HIGHLIGHT_SECTION ? (
                  <section
                    key={section.key}
                    className="rounded-card bg-sun-surface px-4 py-3.5"
                  >
                    <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">
                      {section.title}
                    </h2>
                    <Markdown source={section.body} className="mt-2" tone="sun" />
                  </section>
                ) : (
                  <section key={section.key}>
                    <h2 className="font-display text-[21px] font-bold tracking-tight text-ink">
                      {section.title}
                    </h2>
                    <Markdown source={section.body} className="mt-2" />

                    {/*
                      Zkratka dolů sedí až pod prvním odstavcem, ne nad ním.
                      Nabízet skok na konec dřív, než klient přečte shrnutí,
                      by znamenalo pobízet ho, ať zápis přeskočí.
                    */}
                    {index === 0 && (
                      <a
                        href="#zpetna-vazba"
                        className="mt-3 inline-block text-[15px] text-turquoise-700 underline underline-offset-4"
                      >
                        Přejít na tvoji zpětnou vazbu ↓
                      </a>
                    )}
                  </section>
                ),
              )}
            </article>
          </>
        )}

        <FeedbackForm sessionId={session.id} feedback={feedback ?? null} />
      </div>
    </Screen>
  );
}
