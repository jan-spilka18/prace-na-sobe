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
}: {
  source: string;
  className?: string;
}) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-3 text-[16px] leading-relaxed text-ink", className)}>
      {blocks.map((block, index) => {
        if (block.kind === "bullets") {
          return (
            <ul key={index} className="space-y-1.5 pl-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2.5">
                  <span aria-hidden className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-turquoise" />
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
            <ol key={index} className="space-y-1.5 pl-1">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="shrink-0 text-[15px] font-semibold tabular-nums text-turquoise-700"
                  >
                    {itemIndex + 1}.
                  </span>
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
