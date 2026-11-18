import { Markdown } from "@/components/Markdown";
import type { SessionSection } from "@/lib/sessionTemplate";

/**
 * Zápis ze sezení, jak ho čte klient.
 *
 * Jeden souvislý text s mezinadpisy, ne pět samostatných karet. Barevně
 * vystupují jen dvě části: co se povedlo a úkoly — podle těch se klient
 * do příštího sezení řídí.
 */
export function SessionArticle({
  sections,
}: {
  sections: Array<SessionSection & { body: string }>;
}) {
  return (
    <article className="space-y-6 rounded-group bg-surface px-5 py-6">
      {sections.map((section, index) => (
        <div key={section.key} className="space-y-6">
          <SectionBlock section={section} />
          {section.key === "summary" && index < sections.length - 1 && (
            <hr className="border-hairline" />
          )}
        </div>
      ))}
    </article>
  );
}

function SectionBlock({
  section,
}: {
  section: SessionSection & { body: string };
}) {
  if (section.key === "wins") {
    return (
      <section className="space-y-2.5 rounded-card bg-turquoise-100 px-4 py-4">
        <h2 className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight text-turquoise-700">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          {section.title}
        </h2>
        <Markdown source={section.body} />
      </section>
    );
  }

  if (section.key === "tasks") {
    return (
      <section className="space-y-3 rounded-card bg-sun-surface px-4 py-4">
        <h2 className="font-display text-[19px] font-extrabold tracking-tight text-ink">
          {section.title}
        </h2>
        <Markdown source={section.body} tone="sun" numbers="badge" />
      </section>
    );
  }

  return (
    <section className="space-y-2.5">
      <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">
        {section.title}
      </h2>
      <Markdown
        source={section.body}
        size={section.key === "summary" ? "lg" : "base"}
      />
    </section>
  );
}
