export interface StockMatchCandidate {
  id: string;
  symbol: string;
  name: string;
}

const COMPANY_SUFFIXES = new Set([
  "co",
  "company",
  "limited",
  "ltd",
  "plc",
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
  text: string,
  stocks: StockMatchCandidate[],
): StockMatchCandidate | null {
  const normalizedText = normalizeStockText(text);
  if (!normalizedText) return null;

  const scored = stocks
    .map((stock) => {
      const symbol = normalizeStockText(stock.symbol);
      const core = companyCore(stock.name);
      let score = 0;

      if (symbol.length >= 3 && containsPhrase(normalizedText, symbol)) score = 100;
      if (core.length >= 4 && containsPhrase(normalizedText, core)) score = Math.max(score, 90);

      return { stock, score };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  if (!scored.length) return null;
  if (scored.length > 1 && scored[0].score === scored[1].score) return null;
  return scored[0].stock;
}
