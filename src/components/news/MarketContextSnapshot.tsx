import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ExternalLink } from "lucide-react";
import { type PublicStock } from "@/lib/api";

type Tone = "positive" | "negative" | "neutral";

interface Metric {
  label: string;
  value: string;
  tone?: Tone;
}

interface MarketContextSnapshotProps {
  title?: string;
  description?: string;
  href?: string;
  metrics: Metric[];
}

export interface MarketSnapshotAsset {
  id?: string;
  symbol?: string;
  name?: string;
  price?: number;
  previousPrice?: number | null;
  previous_price?: number | null;
  changePercent?: number;
  day_change_percent?: number;
  yield?: number;
  annualYield?: number;
  rate?: number;
  unit?: string;
  slug?: string;
  pair?: string;
}

const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;

const movementTone = (value: number): Tone => {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
};

const metricTextClass = (tone: Tone = "neutral") => {
  if (tone === "positive") return "text-emerald-500";
  if (tone === "negative") return "text-rose-500";
  return "text-foreground";
};

export function MarketContextSnapshot({ title = "Market context", description, href, metrics }: MarketContextSnapshotProps) {
  const visibleMetrics = metrics.filter((metric) => metric.value && metric.value !== "NaN");

  if (visibleMetrics.length === 0) return null;

  const content = (
    <>
      {visibleMetrics.map((metric) => {
        const isDirectional = metric.tone === "positive" || metric.tone === "negative";
        const DirectionIcon = metric.tone === "negative" ? ArrowDownRight : ArrowUpRight;
        return (
          <div key={metric.label} className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {metric.label}
            </p>
            <p className={`flex items-center gap-1 text-[14px] font-bold tabular-nums ${metricTextClass(metric.tone)}`}>
              {isDirectional && <DirectionIcon className="h-3.5 w-3.5" />}
              {metric.value}
            </p>
          </div>
        );
      })}
    </>
  );

  return (
    <section className="space-y-3 border-b border-border pb-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {href && <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>

      {href ? (
        <Link
          to={href}
          onClick={(event) => event.stopPropagation()}
          className="grid gap-2 rounded-xl border border-border bg-muted/25 p-3 transition-colors hover:bg-muted/40 sm:grid-cols-3"
        >
          {content}
        </Link>
      ) : (
        <div className="grid gap-2 rounded-xl border border-border bg-muted/25 p-3 sm:grid-cols-3">
          {content}
        </div>
      )}
    </section>
  );
}

export function buildStockMarketContext(stock?: PublicStock | MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!stock) return null;
  const price = Number(stock.price) || 0;
  const change = Number("day_change_percent" in stock ? stock.day_change_percent : stock.changePercent) || 0;
  const previousPrice = "previous_price" in stock ? stock.previous_price : stock.previousPrice;
  const metrics: Metric[] = [
    { label: "Latest price", value: `KES ${price.toFixed(2)}` },
    { label: "1D move", value: formatPercent(change), tone: movementTone(change) },
  ];
  if (previousPrice != null) {
    metrics.push({ label: "Previous", value: `KES ${Number(previousPrice).toFixed(2)}` });
  }
  return {
    title: `${stock.symbol || "Stock"} market context`,
    description: "Separate from the article: latest linked stock data already available on Kenya Fund Finder.",
    href: stock.symbol ? `/stocks/${stock.symbol}` : undefined,
    metrics,
  };
}

export function buildMmfMarketContext(mmf?: MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!mmf) return null;
  const annualYield = Number(mmf.annualYield ?? mmf.yield) || 0;
  const change = Number(mmf.changePercent) || 0;
  return {
    title: `${mmf.name || "MMF"} market context`,
    description: "Separate from the article: current fund data already available on Kenya Fund Finder.",
    href: mmf.slug ? `/compare/${mmf.slug}` : undefined,
    metrics: [
      { label: "Annual yield", value: `${annualYield.toFixed(2)}%` },
      { label: "Yield move", value: formatPercent(change), tone: movementTone(change) },
    ],
  };
}

export function buildFxMarketContext(fx?: MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!fx) return null;
  const change = Number(fx.changePercent) || 0;
  return {
    title: `${fx.pair || "FX"} market context`,
    description: "Separate from the article: latest exchange-rate data already available on Kenya Fund Finder.",
    href: "/rates",
    metrics: [
      { label: "Latest rate", value: `KES ${(Number(fx.rate) || 0).toFixed(2)}` },
      { label: "Move", value: formatPercent(change), tone: movementTone(change) },
    ],
  };
}

export function buildCommodityMarketContext(commodity?: MarketSnapshotAsset | null): MarketContextSnapshotProps | null {
  if (!commodity) return null;
  const change = Number(commodity.changePercent) || 0;
  return {
    title: `${commodity.name || "Commodity"} market context`,
    description: "Separate from the article: latest commodity data already available on Kenya Fund Finder.",
    href: "/commodities",
    metrics: [
      { label: "Latest price", value: `${(Number(commodity.price) || 0).toFixed(2)} ${commodity.unit || ""}`.trim() },
      { label: "Move", value: formatPercent(change), tone: movementTone(change) },
    ],
  };
}
