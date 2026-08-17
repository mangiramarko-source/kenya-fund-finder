import { BadgeDollarSign, ChartCandlestick, Coins, Landmark } from "lucide-react";

interface RelatedMarketsStripProps {
  markets?: string[];
  implications?: Array<{ market: string; implication: string }>;
}

const MARKET_STYLES: Record<string, { label: string; Icon: typeof ChartCandlestick }> = {
  stocks: { label: "Stocks", Icon: ChartCandlestick },
  mmfs: { label: "MMFs", Icon: Landmark },
  "unit trusts": { label: "MMFs", Icon: Landmark },
  fx: { label: "FX", Icon: BadgeDollarSign },
  "fx rates": { label: "FX", Icon: BadgeDollarSign },
  commodities: { label: "Commodities", Icon: Coins },
};

const normalizeMarket = (market: string) => {
  const normalized = market.trim().toLowerCase();
  if (normalized.includes("stock")) return "stocks";
  if (normalized.includes("mmf") || normalized.includes("fund") || normalized.includes("unit trust")) return "mmfs";
  if (normalized.includes("fx") || normalized.includes("currency") || normalized.includes("exchange")) return "fx";
  if (normalized.includes("commod")) return "commodities";
  return normalized;
};

export function RelatedMarketsStrip({ markets, implications }: RelatedMarketsStripProps) {
  const relatedMarkets = Array.from(
    new Set([
      ...(markets || []).map(normalizeMarket),
      ...(implications || []).map((item) => normalizeMarket(item.market)),
    ].filter((market) => MARKET_STYLES[market])),
  );
  const relatedImplications = (implications || [])
    .map((item) => ({
      ...item,
      normalizedMarket: normalizeMarket(item.market),
      implication: item.implication?.trim(),
    }))
    .filter((item) => MARKET_STYLES[item.normalizedMarket] && item.implication);

  if (relatedMarkets.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
          Related Markets
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          source-supported
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {relatedMarkets.map((market) => {
          const { label, Icon } = MARKET_STYLES[market];
          return (
            <span
              key={market}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-[12px] font-semibold text-foreground/85"
            >
              <Icon className="h-3.5 w-3.5 text-emerald-500" />
              {label}
            </span>
          );
        })}
      </div>
      {relatedImplications.length > 0 && (
        <div className="space-y-2">
          {relatedImplications.map((item, index) => (
            <p key={`${item.normalizedMarket}-${index}`} className="text-[14px] leading-relaxed text-foreground/85">
              <span className="font-bold text-foreground">{MARKET_STYLES[item.normalizedMarket].label}: </span>
              {item.implication}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
