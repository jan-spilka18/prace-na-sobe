import { SESSION_SECTIONS } from "@/lib/sessionTemplate";
import type { SessionKind } from "@/lib/database.types";

/*
  Rozřazení vloženého zápisu do sekcí.

  Honza vloží celé shrnutí ze sezení jedním kusem — typicky tak, jak ho
  vydá nahrávací aplikace. Text se projde řádek po řádku: když řádek vypadá
  jako nadpis a jmenuje se jako některá sekce (viz `aliases` v šabloně),
  všechno pod ním až po další takový nadpis patří do té sekce. Text před
  prvním rozpoznaným nadpisem jde do Shrnutí.

  Bez AI a bez sítě: zdarma, okamžitě a nic z rozhovoru neopouští aplikaci.
  Výsledek je jen návrh — Honza ho vidí v políčkách a opraví, co nesedí.
*/

export type SortResult = {
  /** Text pro každou sekci, i prázdný. */
  content: Record<string, string>;
  /** Sekce, které se našly podle nadpisu. */
  found: string[];
  /** Co se dalo vyčíst z hlavičky („Datum sezení: …", „Typ sezení: …"). */
  meta: { date?: string; kind?: SessionKind };
  /**
   * Všechno od „POZNÁMKA PRO HONZU (neposílat)" dál. Do obsahu zápisu
   * se to nedostane — ten čte klient.
   */
  privateNote: string;
};

const FALLBACK = SESSION_SECTIONS[0].key;

/** Malá písmena, bez diakritiky, bez ozdob nadpisu a koncové dvojtečky. */
export function plainLabel(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^[#\s]+/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\*\*|__/g, "")
    .replace(/[:*\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sekce, které odpovídá popisek. `loose` dovolí za názvem ještě pokračování
 * („Úkoly do příště (do 25. 11.)") — jen u řádků, které jsou nadpisem
 * zjevně, jinak by se za nadpis považovala obyčejná věta.
 */
function sectionFor(label: string, loose: boolean): string | null {
  const name = plainLabel(label);
  if (name === "" || name.length > 60) return null;

  for (const section of SESSION_SECTIONS) {
    for (const alias of section.aliases) {
      if (name === alias) return section.key;
      if (loose && name.startsWith(`${alias} `)) return section.key;
    }
  }
  return null;
}

const BULLET = /^[-*•]\s/;

/** Řádek je nadpisem zjevně: #, celý tučný, nebo krátký s dvojtečkou na konci. */
function markedHeading(line: string): boolean {
  if (line.length > 70 || BULLET.test(line)) return false;
  return (
    line.startsWith("#") ||
    /^\*\*[^*]+\*\*:?$/.test(line) ||
    /^__[^_]+__:?$/.test(line) ||
    /:\s*$/.test(line)
  );
}

/** Řádek hlavičky: „Popisek: hodnota" s popiskem ze šablony. */
const HEADER = /^(klient|datum sezeni|datum|sezeni c|cislo sezeni|tyden programu|typ sezeni|typ)\.?\s*:\s*(.*)$/;

/** Oddělovač „---" nad poznámkou pro Honzu. Do zápisu se nepřenáší. */
const RULE = /^(-{3,}|\*{3,}|_{3,})$/;

/** Začátek části, kterou klient nesmí vidět. */
function privateStart(text: string): boolean {
  const name = plainLabel(text);
  return (
    name.includes("neposilat") ||
    name.startsWith("poznamka pro honzu") ||
    name.startsWith("poznamka pro kouce") ||
    name.startsWith("zapis pro kouce") ||
    name.startsWith("rozbor pro kouce")
  );
}

/** „12.11.2026", „12. 11. 2026" nebo „2026-11-12" → ISO datum. */
export function parseCzechDate(value: string): string | undefined {
  const czech = value.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  const [y, m, d] = czech
    ? [Number(czech[3]), Number(czech[2]), Number(czech[1])]
    : iso
      ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
      : [0, 0, 0];
  if (!y) return undefined;

  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return undefined;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function parseSessionKind(value: string): SessionKind | undefined {
  const name = plainLabel(value);
  if (name.includes("reflexe")) return "monthly_review";
  if (name.includes("zapas")) return "pregame";
  if (name.includes("dech") || name.includes("breath")) return "breathwork";
  if (name.includes("koucink") || name.includes("coaching")) return "coaching";
  return undefined;
}

export function sortSessionText(raw: string): SortResult {
  const lines: Record<string, string[]> = {};
  for (const section of SESSION_SECTIONS) lines[section.key] = [];
  const found = new Set<string>();
  const meta: SortResult["meta"] = {};
  const privateLines: string[] = [];

  let current = FALLBACK;
  let inPrivate = false;

  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const text = line.trim();

    // Od poznámky pro Honzu dál už nic nepatří klientovi.
    if (inPrivate) {
      privateLines.push(line);
      continue;
    }
    if (text !== "" && !BULLET.test(text) && privateStart(text)) {
      inPrivate = true;
      continue;
    }
    if (RULE.test(text)) continue;

    // Hlavička nad první sekcí: datum a typ se převezmou, zbytek
    // (jméno, číslo sezení, týden) si aplikace ví sama.
    if (found.size === 0) {
      const header = plainLabel(text).match(HEADER);
      if (header) {
        const value = text.slice(text.indexOf(":") + 1).trim();
        if (header[1].startsWith("datum")) meta.date = parseCzechDate(value) ?? meta.date;
        if (header[1].startsWith("typ")) meta.kind = parseSessionKind(value) ?? meta.kind;
        continue;
      }
    }

    if (text !== "" && !BULLET.test(text)) {
      const marked = markedHeading(text);
      // Holý řádek „Co se povedlo" je nadpis, jen když se jmenuje přesně
      // jako sekce. U zjevného nadpisu stačí, že tak začíná.
      const key = sectionFor(text, marked);

      // Podnadpis uvnitř sekce, který se jmenuje jako ona sama
      // („Denní návyky v 90denní výzvě:" pod „Závazky a denní návyky"),
      // je obsah, ne nový nadpis — jinak by zmizel.
      const subLabel = key === current && found.has(key) && !text.startsWith("#");

      if (key && !subLabel) {
        current = key;
        found.add(key);
        continue;
      }

      // „Úkoly: zavolat do banky" — nadpis i obsah na jednom řádku.
      const inline = text.match(/^([^:]{2,40}):\s+(.+)$/);
      const inlineKey = inline ? sectionFor(inline[1], false) : null;
      if (inline && inlineKey && inlineKey !== current) {
        current = inlineKey;
        found.add(inlineKey);
        lines[current].push(inline[2]);
        continue;
      }

      // Neznámý nadpis Markdownu zůstane v textu jako tučný řádek, ať se
      // členění neztratí. Obyčejná věta s dvojtečkou zůstane, jak je.
      if (text.startsWith("#")) {
        lines[current].push(`**${text.replace(/^#+\s*/, "")}**`);
        continue;
      }
    }

    lines[current].push(line);
  }

  const content: Record<string, string> = {};
  for (const section of SESSION_SECTIONS) {
    content[section.key] = lines[section.key]
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return {
    content,
    found: SESSION_SECTIONS.map((s) => s.key).filter((key) => found.has(key)),
    meta,
    privateNote: privateLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

/*
  Témata pro zpětnou vazbu („Co tě dnes bavilo nejvíc?").

  Navrhují se z klíčových uvědomění a z fokusu do příštího sezení — každá
  odrážka je jedno téma. Téma má být pár slov, ne věta: když je v odrážce
  něco tučně, je to ono; jinak se vezme začátek před pomlčkou nebo
  dvojtečkou, a když je pořád dlouhý, zkrátí se na celá slova.
  Je to návrh: Honza seznam před publikováním uvidí a přepíše.
*/

export const MAX_TOPICS = 6;
const TOPIC_LENGTH = 40;

const TOPIC_SOURCES = ["insights", "key_points", "focus"];

export function suggestTopics(content: Record<string, string>): string[] {
  const topics: string[] = [];

  for (const key of TOPIC_SOURCES) {
    for (const raw of (content[key] ?? "").split("\n")) {
      const line = raw.replace(/^\s*([-*•]|\d+[.)])\s*/, "").trim();
      if (line === "") continue;
      const topic = topicFrom(line);
      if (topic && !topics.some((t) => t.toLowerCase() === topic.toLowerCase())) {
        topics.push(topic);
      }
      if (topics.length >= MAX_TOPICS) return topics;
    }
  }

  return topics;
}

function topicFrom(line: string): string | null {
  // Uvědomění bývají citace klienta v uvozovkách — téma jsou slova, ne uvozovky.
  line = line.replace(/[„“”"«»]/g, "").trim();
  const bold = line.match(/\*\*([^*]+)\*\*/);
  let topic = bold ? bold[1] : line.replace(/\*\*|__|_/g, "");

  if (!bold) {
    // Začátek do první pomlčky, dvojtečky nebo čárky — tam věta obvykle
    // přechází od tématu k vysvětlení.
    // Jen když začátek dává smysl sám o sobě: „Sledovat, jak rychle…"
    // by uřízlo jediné slovo, a to téma není.
    const head = topic.split(/\s[–—-]\s|:\s|,\s/)[0];
    if (head.length >= 4 && head.trim().split(/\s+/).length >= 2) topic = head;
  }

  topic = topic.replace(/[.!?;:,]+$/, "").trim();
  if (topic.length < 3) return null;

  if (topic.length > TOPIC_LENGTH) {
    const cut = topic.slice(0, TOPIC_LENGTH + 1);
    topic = `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:–—-]+$/, "").trim()}…`;
  }

  return topic.charAt(0).toUpperCase() + topic.slice(1);
}
