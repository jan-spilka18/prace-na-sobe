/*
  Drobná podmnožina Markdownu pro zápisy ze sezení: odrážky, číslovaný
  seznam, tučné a kurzíva.

  Proč vlastní parser a ne knihovna: potřebujeme jen tohle a výstup se
  vykresluje jako React prvky, ne jako HTML. Nikde se nevolá
  dangerouslySetInnerHTML, takže do zápisu nejde propašovat skript —
  a zápisy čte klient.

  Proč Markdown a ne formát editoru: text zůstane čitelný i mimo aplikaci.
  Až se zápisy budou přebírat z nahrávací aplikace nebo posílat do Notionu,
  nebude co převádět.
*/

export type InlineToken =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string };

export type Block =
  | { kind: "paragraph"; lines: InlineToken[][] }
  | { kind: "bullets"; items: InlineToken[][] }
  | { kind: "numbers"; items: InlineToken[][] };

const BULLET = /^\s*[-*•]\s+/;
const NUMBER = /^\s*\d+[.)]\s+/;

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  // Prázdný řádek odděluje bloky. Uvnitř odstavce se zalomení zachová.
  const chunks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);

  for (const chunk of chunks) {
    const lines = chunk.split("\n").filter((line) => line.trim() !== "");
    if (lines.length === 0) continue;

    if (lines.every((line) => BULLET.test(line))) {
      blocks.push({
        kind: "bullets",
        items: lines.map((line) => parseInline(line.replace(BULLET, ""))),
      });
      continue;
    }

    if (lines.every((line) => NUMBER.test(line))) {
      blocks.push({
        kind: "numbers",
        items: lines.map((line) => parseInline(line.replace(NUMBER, ""))),
      });
      continue;
    }

    blocks.push({
      kind: "paragraph",
      lines: lines.map((line) => parseInline(line)),
    });
  }

  return blocks;
}

// Nejdřív dvojité hvězdičky, pak jednoduché — jinak by `**text**` spadlo
// do kurzívy a zbyly by osamělé hvězdičky.
const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;

export function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];

  for (const part of text.split(INLINE)) {
    if (part === "") continue;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      tokens.push({ kind: "strong", text: part.slice(2, -2) });
    } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      tokens.push({ kind: "em", text: part.slice(1, -1) });
    } else {
      tokens.push({ kind: "text", text: part });
    }
  }

  return tokens;
}

/** Holý text bez značek — pro náhledy v seznamu. */
export function plainText(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(BULLET, "").replace(NUMBER, ""))
    .join(" ")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
