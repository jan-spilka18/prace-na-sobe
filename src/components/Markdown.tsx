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
}: {
  source: string;
  className?: string;
  /** Na žlutém ani na tmavém podkladu není tyrkysová odrážka vidět. */
  tone?: "default" | "sun" | "dark";
  /** lg pro úvodní shrnutí, které se čte jako perex. */
  size?: "base" | "lg";
  /** badge: číslo v kolečku — pro úkoly, ať se dají odškrtávat očima. */
  numbers?: "plain" | "badge";
}) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;

  /*
    Odrážka je interpunkce, ne ozdoba. Tyrkysová z ní dělala další barevný
    prvek na stránce a text se kvůli ní hůř četl jako souvislá úvaha.
  */
  const marker =
    tone === "sun" ? "bg-ink/50" : tone === "dark" ? "bg-sun" : "bg-ink/40";
  const counter =
    tone === "sun"
      ? "text-ink/60"
      : tone === "dark"
        ? "text-sun"
        : "text-turquoise-700";
  // Barva textu patří sem, ne do className volajícího: cn() třídy jen
  // slepuje, takže by se text-ink a text-white přebíjely podle pořadí
  // v CSS, ne podle pořadí v zápisu.
  const text = tone === "dark" ? "text-white" : "text-ink";
  // Velikost taky sem, ze stejného důvodu jako barva.
  const fontSize = size === "lg" ? "text-[17px] leading-[1.6]" : "text-[16px] leading-relaxed";

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
                    <Inline tokens={item} />
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
                    <Inline tokens={item} />
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
                <Inline tokens={line} />
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ tokens }: { tokens: InlineToken[] }) {
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
        return <span key={index}>{token.text}</span>;
      })}
    </>
  );
}
