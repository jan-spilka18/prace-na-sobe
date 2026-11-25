import { parseMarkdown, type InlineToken } from "@/lib/markdown";
import { cn } from "@/lib/cn";

/**
 * Vykreslí zápis ze sezení.
 *
 * Staví React prvky, ne HTML řetězec — nikde se nevolá
 * dangerouslySetInnerHTML, takže do zápisu nejde propašovat skript.
 */
export function Markdown({
  source,
  className,
  tone = "default",
  size = "base",
  numbers = "plain",
  links = true,
}: {
  source: string;
  className?: string;
  /**
   * Na žlutém ani na tmavém podkladu není tyrkysová odrážka vidět.
   * accent: tmavý text na plné tyrkysové, v obou režimech stejný.
   */
  tone?: "default" | "sun" | "dark" | "accent";
  /** lg pro úvodní shrnutí a citáty, xl pro fokus a otázku k zamyšlení. */
  size?: "sm" | "base" | "lg" | "xl";
  /** badge: číslo v kolečku — pro úkoly, ať se dají odškrtávat očima. */
  numbers?: "plain" | "badge";
  /** false tam, kde je celý blok sám odkazem — odkaz v odkazu nejde. */
  links?: boolean;
}) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;

  /*
    Odrážka je interpunkce, ne ozdoba. Tyrkysová z ní dělala další barevný
    prvek na stránce a text se kvůli ní hůř četl jako souvislá úvaha.
  */
  const marker =
    tone === "sun"
      ? "bg-ink/50"
      : tone === "dark"
        ? "bg-sun"
        : tone === "accent"
          ? "bg-on-sun/50"
          : "bg-ink/40";
  const counter =
    tone === "sun"
      ? "text-ink/60"
      : tone === "dark"
        ? "text-sun"
        : tone === "accent"
          ? "text-on-sun/70"
          : "text-turquoise-700";
  // Barva textu patří sem, ne do className volajícího: cn() třídy jen
  // slepuje, takže by se text-ink a text-white přebíjely podle pořadí
  // v CSS, ne podle pořadí v zápisu.
  const text =
    tone === "dark" ? "text-white" : tone === "accent" ? "text-on-sun" : "text-ink";
  // Velikost taky sem, ze stejného důvodu jako barva.
  const fontSize =
    size === "xl"
      ? "text-[19px] leading-snug"
      : size === "lg"
        ? "text-[17px] leading-[1.6]"
        : size === "sm"
          ? "text-[14px] leading-snug"
        : "text-[16px] leading-relaxed";

  // Na barevném podkladu odkaz drží barvu textu a pozná se podtržením.
  const link = !links
    ? null
    : tone === "default"
      ? "text-turquoise-700 underline decoration-turquoise/50 underline-offset-2"
      : "underline underline-offset-2";

  return (
    <div className={cn("space-y-3", fontSize, text, className)}>
      {blocks.map((block, index) => {
        if (block.kind === "bullets") {
          return (
            <ul key={index} className="space-y-1.5 pl-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full",
                      marker,
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <Inline tokens={item} link={link} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "numbers") {
          return (
            <ol
              key={index}
              className={numbers === "badge" ? "space-y-3" : "space-y-1.5 pl-1"}
            >
              {block.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className={cn("flex", numbers === "badge" ? "gap-3" : "gap-2.5")}
                >
                  {numbers === "badge" ? (
                    // Tmavé kolečko se světlým číslem. bg-ink a text-sun-surface
                    // se v tmavém režimu otočí spolu, takže kontrast drží.
                    <span
                      aria-hidden
                      className="mt-px flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-extrabold tabular-nums text-sun-surface"
                    >
                      {itemIndex + 1}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        "shrink-0 text-[15px] font-semibold tabular-nums",
                        counter,
                      )}
                    >
                      {itemIndex + 1}.
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <Inline tokens={item} link={link} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <span key={lineIndex}>
                {lineIndex > 0 && <br />}
                <Inline tokens={line} link={link} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ tokens, link }: { tokens: InlineToken[]; link: string | null }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.kind === "strong") {
          return (
            <strong key={index} className="font-semibold">
              {token.text}
            </strong>
          );
        }
        if (token.kind === "em") {
          return <em key={index}>{token.text}</em>;
        }
        if (token.kind === "link" && link) {
          return (
            <a
              key={index}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("break-words font-semibold", link)}
            >
              {token.text}
            </a>
          );
        }
        return <span key={index}>{token.text}</span>;
      })}
    </>
  );
}
