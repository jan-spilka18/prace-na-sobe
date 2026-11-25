import { safeUrl } from "@/lib/url";

/*
  Odkazy a materiály k sezení: video, které Honza slíbil, dokument
  s úkolem k vyplnění, článek. V zápisu je to obyčejný text, jeden odkaz
  na řádek — „Název — adresa", „[Název](adresa)" nebo jen adresa. Tady se
  z něj stávají tlačítka.
*/

export type SessionLinkKind = "video" | "doc" | "link";

export type SessionLink = {
  label: string;
  /** null = řádek bez adresy; ukáže se jako obyčejný text. */
  url: string | null;
  kind: SessionLinkKind;
  /** „youtube.com" — pod názvem, ať je vidět, kam odkaz vede. */
  host: string;
};

const ITEM = /^\s*([-*•]|\d+[.)])\s+/;
const MD_LINK = /\[([^\]\n]+)\]\(([^)\s]+)\)/;
// Adresa se schématem, s www, nebo holá doména s cestou („youtu.be/abc").
const URL_IN_TEXT =
  /(https?:\/\/[^\s<>]+|www\.[^\s<>]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>]*)/i;

const VIDEO = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|loom\.com)$/;
const DOC =
  /(^|\.)(docs\.google\.com|drive\.google\.com|forms\.gle|notion\.so|notion\.site|dropbox\.com|typeform\.com|tally\.so|claude\.ai)$/;

export function linkKind(url: string): SessionLinkKind {
  let host = "";
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase();
    path = parsed.pathname.toLowerCase();
  } catch {
    return "link";
  }
  if (VIDEO.test(host)) return "video";
  if (DOC.test(host) || /\.(pdf|docx?|xlsx?)$/.test(path)) return "doc";
  return "link";
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

const DEFAULT_LABEL: Record<SessionLinkKind, string> = {
  video: "Video",
  doc: "Dokument",
  link: "Odkaz",
};

export function parseLinks(body: string): SessionLink[] {
  const links: SessionLink[] = [];

  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.replace(ITEM, "").trim();
    if (line === "") continue;

    let label = line;
    let address: string | null = null;

    const md = line.match(MD_LINK);
    if (md) {
      label = md[1];
      address = md[2];
    } else {
      const found = line.match(URL_IN_TEXT);
      if (found) {
        // Tečka nebo čárka za adresou patří k větě, ne k odkazu.
        address = found[0].replace(/[.,;:!?)]+$/, "");
        label = line.replace(found[0], " ");
      }
    }

    const url = safeUrl(address);
    if (!url) {
      links.push({ label: line, url: null, kind: "link", host: "" });
      continue;
    }

    const kind = linkKind(url);
    // Z názvu pryč oddělovače, které zbyly po vyjmutí adresy.
    label = label
      .replace(/\s+/g, " ")
      .replace(/^[\s—–\-:|]+|[\s—–\-:|]+$/g, "")
      .trim();

    links.push({
      label: label || DEFAULT_LABEL[kind],
      url,
      kind,
      host: hostOf(url),
    });
  }

  return links;
}

/** Řádek, jak se odkaz ukládá do zápisu. */
export function linkLine(label: string, url: string): string {
  const name = label.trim();
  return name ? `- ${name} — ${url}` : `- ${url}`;
}
