export interface StockMatchCandidate {
  id: string;
  symbol: string;
  name: string;
}

export interface StockMatchInput {
  title: string;
  body?: string | null;
}

export interface StockMatchEvidence {
  stock: StockMatchCandidate;
  kind: "tagged_ticker" | "title_ticker" | "title_company" | "body_company" | "contextual_ticker";
  evidence: string;
  score: number;
}

const COMPANY_SUFFIXES = new Set([
  "co",
  "company",
  "limited",
  "ltd",
  "plc",
]);

const AMBIGUOUS_SYMBOLS = new Set([
  "BAT", "CARB", "PORT", "SGL", "TOTL", "SCAN", "UCHM", "KEGN",
]);

const GENERIC_COMPANY_CORES = new Set([
  "standard group", "sameer africa", "express kenya", "home africa",
]);

export function normalizeStockText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function companyCore(name: string): string {
  return normalizeStockText(name)
    .split(" ")
    .filter((token) => token && !COMPANY_SUFFIXES.has(token))
    .join(" ");
}

function containsPhrase(haystack: string, phrase: string): boolean {
  return phrase.length > 0 && ` ${haystack} `.includes(` ${phrase} `);
}

export function matchStockDeterministically(
  input: string | StockMatchInput,
  stocks: StockMatchCandidate[],
): StockMatchCandidate | null {
  return matchStockWithEvidence(input, stocks)?.stock || null;
}

function hasExactUppercaseToken(text: string, symbol: string): boolean {
  return new RegExp(`(?:^|[^A-Z0-9])${symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^A-Z0-9])`).test(text);
}

function hasTaggedTicker(text: string, symbol: string): boolean {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:\\$${escaped}\\b|\\bNSE\\s*[:.-]\\s*${escaped}\\b)`, "i").test(text);
}

export function matchStockWithEvidence(
  input: string | StockMatchInput,
  stocks: StockMatchCandidate[],
): StockMatchEvidence | null {
  const title = typeof input === "string" ? input : input.title;
  const body = typeof input === "string" ? "" : input.body || "";
  const normalizedTitle = normalizeStockText(title);
  const normalizedBody = normalizeStockText(body);
  if (!normalizedTitle && !normalizedBody) return null;

  const marketContext = /\b(nse|nairobi securities exchange|listed|shares?|stock|ticker|plc|earnings|dividend)\b/i.test(`${title} ${body}`);

  const scored = stocks
    .map((stock) => {
      const rawSymbol = stock.symbol.trim().toUpperCase();
      const symbol = normalizeStockText(rawSymbol);
      const core = companyCore(stock.name);
      let score = 0;
      let kind: StockMatchEvidence["kind"] | null = null;
      let evidence = "";

      if (symbol.length >= 3 && hasTaggedTicker(title, rawSymbol)) {
        score = 140;
        kind = "tagged_ticker";
        evidence = rawSymbol;
      } else if (symbol.length >= 3 && hasExactUppercaseToken(title, rawSymbol)
        && (!AMBIGUOUS_SYMBOLS.has(rawSymbol) || marketContext)) {
        score = 120;
        kind = "title_ticker";
        evidence = rawSymbol;
      }

      const companyMatchAllowed = core.length >= 5 && !GENERIC_COMPANY_CORES.has(core);
      if (companyMatchAllowed && containsPhrase(normalizedTitle, core) && score < 130) {
        score = 130;
        kind = "title_company";
        evidence = core;
      } else if (companyMatchAllowed && containsPhrase(normalizedBody, core) && score < 100) {
        score = 100;
        kind = "body_company";
        evidence = core;
      } else if (symbol.length >= 3 && marketContext && hasExactUppercaseToken(body, rawSymbol)
        && !AMBIGUOUS_SYMBOLS.has(rawSymbol) && score < 90) {
        score = 90;
        kind = "contextual_ticker";
        evidence = rawSymbol;
      }

      return { stock, score, kind, evidence };
    })
    .filter((match): match is StockMatchEvidence => match.score > 0 && match.kind !== null)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0];
}
