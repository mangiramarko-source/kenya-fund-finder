const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith("#")) {
      const hexadecimal = key[1]?.toLowerCase() === "x";
      const number = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(number) && number > 0 && number <= 0x10ffff
        ? String.fromCodePoint(number)
        : entity;
    }
    return NAMED_ENTITIES[key.toLowerCase()] ?? entity;
  });
}

export function sanitizeNewsText(value: string): string {
  let text = value || "";
  for (let pass = 0; pass < 2; pass += 1) text = decodeEntities(text);
  return text
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<\s*br\s*\/?\s*>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const PUBLISHER_LABELS = [
  "Business Daily",
  "Capital FM",
  "Citizen Digital",
  "KBC",
  "Kenyan Wall Street",
  "Nation",
  "People Daily",
  "Standard",
  "TechCabal",
  "TechWeez",
  "The Star",
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function comparisonKey(value: string): string {
  return sanitizeNewsText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceLabels(source: string): string[] {
  const cleaned = sanitizeNewsText(source).replace(/^X\s*-\s*/i, "").trim();
  const fallbackLabels = !cleaned || /^google news$/i.test(cleaned) ? PUBLISHER_LABELS : [];
  return [...new Set([cleaned, ...fallbackLabels].filter(Boolean))];
}

export function cleanNewsTitle(title: string, source = ""): string {
  let cleaned = sanitizeNewsText(title);
  for (const label of sourceLabels(source)) {
    cleaned = cleaned.replace(new RegExp(`\\s*[-–—|]\\s*${escapeRegExp(label)}\\s*$`, "i"), "").trim();
  }
  return cleaned
    .replace(/\s*[-–—|]\s*(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}\s*$/i, "")
    .trim();
}

export function isDuplicateNewsText(
  title: string,
  text: string | null | undefined,
  source = "",
): boolean {
  const cleanedText = sanitizeNewsText(text || "");
  if (!cleanedText) return true;

  const textKey = comparisonKey(cleanedText);
  const rawTitleKey = comparisonKey(title);
  const cleanTitleKey = comparisonKey(cleanNewsTitle(title, source));
  if (!textKey) return true;
  if (textKey === rawTitleKey || textKey === cleanTitleKey) return true;

  return sourceLabels(source).some((label) => {
    const sourceKey = comparisonKey(label);
    return textKey === sourceKey || textKey === `${cleanTitleKey}${sourceKey}`;
  });
}

export interface NewsPresentationInput {
  title: string;
  summary?: string | null;
  content?: string | null;
  source?: string | null;
}

export interface NewsPresentation {
  title: string;
  body: string;
  isHeadlineOnly: boolean;
}

export function getNewsPresentation(input: NewsPresentationInput): NewsPresentation {
  const source = input.source || "";
  const title = cleanNewsTitle(input.title, source);
  const summary = isDuplicateNewsText(input.title, input.summary, source)
    ? ""
    : sanitizeNewsText(input.summary || "");
  const content = isDuplicateNewsText(input.title, input.content, source)
    ? ""
    : (input.content || "").trim();
  const body = summary || content;

  return { title, body, isHeadlineOnly: !body };
}
