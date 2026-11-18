import { Markdown } from "@/components/Markdown";
import { cn } from "@/lib/cn";
import { parseTasks, type SessionTask } from "@/lib/sessionTasks";
import type { SessionSection } from "@/lib/sessionTemplate";

type FilledSection = SessionSection & { body: string };

/**
 * Zápis ze sezení, jak ho čte klient.
 *
 * Jeden souvislý text, ale každá sekce má podobu podle toho, k čemu slouží:
 * uvědomění jako citáty, závazky jako seznam k odškrtnutí, fokus jako
 * výrazná karta, otázka k zamyšlení velkým písmem, úkoly rozdělené na
 * klientovy a Honzovy. Klient tak pozná, co je co, i bez čtení nadpisů.
 */
export function SessionArticle({ sections }: { sections: FilledSection[] }) {
  // Úkoly a doporučení jsou jedna karta: obojí je „co dělat do příště",
  // jen jedno povinně a druhé podle chuti.
  const tasks = sections.find((section) => section.key === "tasks");
  const recommendations = sections.find((section) => section.key === "recommendations");
  const visible = sections.filter(
    (section) => !(section.key === "recommendations" && tasks),
  );

  return (
    <article className="space-y-7 rounded-group bg-surface px-5 py-6">
      {visible.map((section, index) => (
        <div key={section.key} className="space-y-7">
          {section.key === "tasks" || section.key === "recommendations" ? (
            <TasksAndRecommendations
              tasks={tasks?.body ?? ""}
              recommendations={recommendations?.body ?? ""}
            />
          ) : (
            <SectionBlock section={section} />
          )}
          {section.key === "summary" && index < visible.length - 1 && (
            <hr className="border-hairline" />
          )}
        </div>
      ))}
    </article>
  );
}

function SectionBlock({ section }: { section: FilledSection }) {
  switch (section.key) {
    case "insights":
      return <Insights section={section} />;
    case "commitments":
      return <Commitments section={section} />;
    case "focus":
      return <Focus section={section} />;
    case "question":
      return <Question section={section} />;
    case "wins":
      return <Wins section={section} />;
    default:
      return (
        <section className="space-y-2.5">
          <Heading>{section.title}</Heading>
          <Markdown
            source={section.body}
            size={section.key === "summary" ? "lg" : "base"}
          />
        </section>
      );
  }
}

function Heading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-display text-[22px] font-extrabold tracking-tight text-ink",
        className,
      )}
    >
      {children}
    </h2>
  );
}

/* ─── Řádky sekce ──────────────────────────────────────────────────────── */

type Line =
  | { kind: "item"; text: string }
  | { kind: "label"; text: string }
  | { kind: "text"; text: string };

const ITEM = /^([-*•]|\d+[.)])\s+/;

/** Odrážky, podnadpisy („Další závazky:") a běžný text, řádek po řádku. */
function sectionLines(body: string): Line[] {
  const lines: Line[] = [];
  for (const raw of body.split("\n")) {
    const text = raw.trim();
    if (text === "") continue;
    if (ITEM.test(text)) {
      lines.push({ kind: "item", text: text.replace(ITEM, "") });
    } else if (text.endsWith(":") && text.length <= 60) {
      lines.push({ kind: "label", text: text.slice(0, -1) });
    } else {
      lines.push({ kind: "text", text });
    }
  }
  return lines;
}

/* ─── Sekce ────────────────────────────────────────────────────────────── */

/** Uvědomění jako citáty — bývají klientovými slovy. */
function Insights({ section }: { section: FilledSection }) {
  const lines = sectionLines(section.body);
  return (
    <section className="space-y-4">
      <Heading>{section.title}</Heading>
      <ul className="space-y-4">
        {lines.map((line, index) => (
          <li key={index} className="flex gap-3">
            <span
              aria-hidden
              className="-mt-1 shrink-0 font-display text-[40px] font-extrabold leading-none text-turquoise"
            >
              „
            </span>
            <Markdown
              source={line.text.replace(/^[„"]|[“”"]$/g, "")}
              className="pt-0.5 font-medium"
              size="lg"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Závazky a návyky jako seznam k odškrtnutí, s podnadpisy. */
function Commitments({ section }: { section: FilledSection }) {
  const lines = sectionLines(section.body);
  return (
    <section className="space-y-3 rounded-card bg-turquoise-100 px-4 py-4">
      <Heading className="text-[19px] text-turquoise-700">{section.title}</Heading>
      <div className="space-y-2.5">
        {lines.map((line, index) =>
          line.kind === "label" ? (
            <p
              key={index}
              className="pt-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-turquoise-700"
            >
              {line.text}
            </p>
          ) : line.kind === "item" ? (
            <div key={index} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 h-[22px] w-[22px] shrink-0 rounded-full border-2 border-turquoise-700/50"
              />
              <Markdown source={line.text} />
            </div>
          ) : (
            <Markdown key={index} source={line.text} />
          ),
        )}
      </div>
    </section>
  );
}

/** Fokus — jedna věc, na kterou má klient do příště myslet. */
function Focus({ section }: { section: FilledSection }) {
  return (
    <section className="space-y-2.5 rounded-card bg-turquoise px-4 py-5 text-on-sun">
      <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em]">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        </svg>
        <span>{section.title}</span>
      </h2>
      <Markdown
        source={section.body}
        tone="accent"
        size="xl"
        className="font-display font-semibold"
      />
    </section>
  );
}

/** Otázka k zamyšlení — velkým písmem, ať se dá nosit v hlavě. */
function Question({ section }: { section: FilledSection }) {
  return (
    <section className="space-y-3 rounded-card bg-canvas px-5 py-5 text-center">
      <span
        aria-hidden
        className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-sun font-display text-[20px] font-extrabold text-on-sun"
      >
        ?
      </span>
      <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-500">
        {section.title}
      </h2>
      <Markdown
        source={section.body}
        size="xl"
        className="font-display font-semibold italic"
      />
    </section>
  );
}

/**
 * Úkoly a doporučení v jedné kartě.
 *
 * Úkoly klienta nahoře, očíslované, s termínem a s tím, kdo s kým, jako
 * štítky — ne slité do věty. Pod nimi, co udělá Honza. Doporučení až na
 * konci a tišeji: nejsou povinná, takže nesmí vypadat jako úkol.
 */
function TasksAndRecommendations({
  tasks: tasksBody,
  recommendations,
}: {
  tasks: string;
  recommendations: string;
}) {
  const tasks = parseTasks(tasksBody);
  const mine = tasks.filter((task) => task.whoKind !== "coach");
  const coach = tasks.filter((task) => task.whoKind === "coach");
  const tips = sectionLines(recommendations);

  const title =
    tasks.length > 0 && tips.length > 0
      ? "Úkoly a doporučení"
      : tasks.length > 0
        ? "Úkoly"
        : "Doporučení";

  return (
    <section className="space-y-4 rounded-card bg-sun-surface px-4 py-4">
      <h2 className="font-display text-[19px] font-extrabold tracking-tight text-ink">
        {title}
      </h2>

      {mine.length > 0 && (
        <TaskGroup label={coach.length > 0 || tips.length > 0 ? "Na tobě" : null}>
          <ol className="space-y-3.5">
            {mine.map((task, index) => (
              <TaskItem key={index} task={task} number={index + 1} />
            ))}
          </ol>
        </TaskGroup>
      )}

      {coach.length > 0 && (
        <TaskGroup label="Co pro tebe udělá Honza">
          <ul className="space-y-3">
            {coach.map((task, index) => (
              <TaskItem key={index} task={task} />
            ))}
          </ul>
        </TaskGroup>
      )}

      {tips.length > 0 && (
        <div className="space-y-2.5 rounded-card bg-surface/70 px-3.5 py-3">
          <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink/60">
            Doporučení · nepovinné
          </p>
          <ul className="space-y-2.5">
            {tips.map((line, index) =>
              line.kind === "label" ? (
                <li key={index} className="pt-1 text-[13px] font-semibold text-ink/70">
                  {line.text}
                </li>
              ) : (
                <li key={index} className="flex gap-2.5">
                  <Icon path={BULB} className="mt-0.5 h-5 w-5 text-turquoise-700" />
                  <Markdown source={line.text} />
                </li>
              ),
            )}
          </ul>
        </div>
      )}
    </section>
  );
}

function TaskGroup({
  label,
  children,
}: {
  label: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      {label && (
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink/60">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

function TaskItem({ task, number }: { task: SessionTask; number?: number }) {
  const together = task.whoKind === "both";

  return (
    <li className="flex gap-3">
      {number !== undefined ? (
        <span
          aria-hidden
          className="mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-extrabold tabular-nums text-sun-surface"
        >
          {number}
        </span>
      ) : (
        <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink/40" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <Markdown source={task.task} className="font-semibold" />
        {(task.due || together) && (
          <div className="flex flex-wrap gap-1.5">
            {task.due && <Chip icon={CALENDAR}>{task.due}</Chip>}
            {together && <Chip icon={PEOPLE}>Spolu s Honzou</Chip>}
          </div>
        )}
        {task.note && (
          <p className="text-[14px] leading-snug text-ink/70">{task.note}</p>
        )}
      </div>
    </li>
  );
}

function Chip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[13px] font-semibold leading-none text-ink">
      <Icon path={icon} className="h-3.5 w-3.5 text-ink/60" />
      {children}
    </span>
  );
}

const CALENDAR = "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4";
const PEOPLE =
  "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3";
const BULB =
  "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2V16h5v-.2c.1-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z";

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={path} />
    </svg>
  );
}

/** Starší sekce „Co se povedlo". */
function Wins({ section }: { section: FilledSection }) {
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
