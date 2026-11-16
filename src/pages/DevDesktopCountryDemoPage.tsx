import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  LayoutGrid,
  List,
  Minus,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { CountryFlagCircle } from "@/components/stocks/MobileCountryExchangeSheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { fetchPublicData } from "@/lib/gateway";
import type { StockExchangeCode } from "@/lib/stockCache";
import { EAST_AFRICAN_MARKETS } from "@/lib/stockExchangeSelection";

interface DemoStockRow {
  symbol: string;
  exchange_ticker: string;
  name: string;
  sector: string;
  price: number;
  day_change_percent: number;
  volume: number;
  currency: string;
}

const SAMPLE_BY_EXCHANGE: Record<StockExchangeCode, {
  gainers: number;
  losers: number;
  unchanged: number;
  rows: DemoStockRow[];
}> = {
  NSE: {
    gainers: 18,
    losers: 12,
    unchanged: 15,
    rows: [
      { symbol: "SCOM", exchange_ticker: "SCOM", name: "Safaricom PLC", sector: "Telecommunications", price: 35.0, day_change_percent: 1.45, volume: 12450000, currency: "KES" },
      { symbol: "EQTY", exchange_ticker: "EQTY", name: "Equity Group Holdings", sector: "Banking", price: 100.0, day_change_percent: 0.75, volume: 1820000, currency: "KES" },
      { symbol: "KCB", exchange_ticker: "KCB", name: "KCB Group PLC", sector: "Banking", price: 89.0, day_change_percent: -0.56, volume: 960000, currency: "KES" },
    ],
  },
  USE: {
    gainers: 4,
    losers: 2,
    unchanged: 12,
    rows: [
      { symbol: "USE-MTNU", exchange_ticker: "MTNU", name: "MTN Uganda Limited", sector: "Telecommunications", price: 455.0, day_change_percent: 1.11, volume: 452000, currency: "UGX" },
      { symbol: "USE-AIRTEL_UGANDA", exchange_ticker: "AIRTEL_UGANDA", name: "Airtel Uganda Limited", sector: "Telecommunications", price: 180.0, day_change_percent: 0.0, volume: 120000, currency: "UGX" },
      { symbol: "USE-SBU", exchange_ticker: "SBU", name: "Stanbic Bank Uganda", sector: "Banking", price: 103.66, day_change_percent: 2.22, volume: 890000, currency: "UGX" },
    ],
  },
  DSE: {
    gainers: 4,
    losers: 11,
    unchanged: 11,
    rows: [
      { symbol: "DSE-CRDB", exchange_ticker: "CRDB", name: "CRDB Bank PLC", sector: "Banking", price: 2790.0, day_change_percent: -0.36, volume: 183000, currency: "TZS" },
      { symbol: "DSE-NMB", exchange_ticker: "NMB", name: "NMB Bank PLC", sector: "Banking", price: 1720.0, day_change_percent: 1.18, volume: 94000, currency: "TZS" },
      { symbol: "DSE-TBL", exchange_ticker: "TBL", name: "Tanzania Breweries Limited", sector: "Manufacturing & Allied", price: 9760.0, day_change_percent: 0.0, volume: 12400, currency: "TZS" },
    ],
  },
  RSE: {
    gainers: 2,
    losers: 1,
    unchanged: 7,
    rows: [
      { symbol: "RSE-BOK", exchange_ticker: "BOK", name: "Bank of Kigali Group PLC", sector: "Banking", price: 720.0, day_change_percent: 0.7, volume: 42000, currency: "RWF" },
      { symbol: "RSE-BLR", exchange_ticker: "BLR", name: "BRALIRWA PLC", sector: "Manufacturing & Allied", price: 571.0, day_change_percent: 0.0, volume: 18500, currency: "RWF" },
      { symbol: "RSE-MTNR", exchange_ticker: "MTNR", name: "MTN Rwanda PLC", sector: "Telecommunications", price: 210.0, day_change_percent: -0.47, volume: 65000, currency: "RWF" },
    ],
  },
};

function fmtPrice(n: number) {
  return n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVol(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function PreviewStocksTable({
  exchange,
  liveByExchange,
}: {
  exchange: StockExchangeCode;
  liveByExchange: Partial<Record<StockExchangeCode, DemoStockRow[]>>;
}) {
  const rows = liveByExchange[exchange]?.slice(0, 4) ?? SAMPLE_BY_EXCHANGE[exchange].rows;
  const market = EAST_AFRICAN_MARKETS.find((m) => m.exchange === exchange)!;

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card/70">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Preview: {market.exchangeName} ({market.exchange})</span>
        <span>Currency: {market.currency}</span>
      </div>
      <div className="divide-y divide-border/50">
        {rows.map((row) => {
          const up = row.day_change_percent > 0;
          const down = row.day_change_percent < 0;
          return (
            <div key={row.symbol} className="grid grid-cols-12 items-center px-4 py-2.5 text-sm">
              <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-bold text-emerald-500">
                  {row.exchange_ticker.slice(0, 2)}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-foreground truncate">{row.exchange_ticker}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{row.name}</div>
                </div>
              </div>
              <div className="col-span-3 text-xs text-muted-foreground truncate">{row.sector}</div>
              <div className="col-span-2 text-right font-semibold tabular-nums text-foreground">
                {row.currency} {fmtPrice(row.price)}
              </div>
              <div
                className={`col-span-2 text-right text-xs font-semibold tabular-nums ${
                  up ? "text-emerald-500" : down ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {up ? "+" : ""}{row.day_change_percent.toFixed(2)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StaticToolbar({ total, gainers, losers, unchanged }: { total: number; gainers: number; losers: number; unchanged: number }) {
  return (
    <div className="flex items-center justify-between gap-4 bg-card border border-border/50 p-1.5 rounded-xl">
      <div className="flex items-center gap-1 pl-1">
        <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium bg-muted text-foreground">
          All <span className="text-[11px] opacity-80">{total}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5 opacity-60" /> Gainers <span className="text-[11px] opacity-50">{gainers}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5 opacity-60" /> Losers <span className="text-[11px] opacity-50">{losers}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-[13px] font-medium text-muted-foreground">
          <Minus className="h-3.5 w-3.5 opacity-60" /> Unchanged <span className="text-[11px] opacity-50">{unchanged}</span>
        </span>
      </div>
      <div className="flex items-center gap-3 pr-1">
        <div className="relative w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input readOnly placeholder="Search symbol or company" className="pl-8 h-8 text-[13px] rounded-md bg-transparent border-border/40" />
        </div>
        <div className="flex items-center bg-muted/20 border border-border/40 rounded-md p-0.5">
          <span className="p-1.5 rounded-[4px] bg-card text-foreground border border-border/50"><List className="h-3.5 w-3.5" /></span>
          <span className="p-1.5 rounded-[4px] text-muted-foreground"><LayoutGrid className="h-3.5 w-3.5" /></span>
        </div>
      </div>
    </div>
  );
}

export default function DevDesktopCountryDemoPage() {
  const [opt1, setOpt1] = useState<StockExchangeCode>("NSE");
  const [opt2, setOpt2] = useState<StockExchangeCode>("USE");
  const [opt3, setOpt3] = useState<StockExchangeCode>("DSE");
  const [liveByExchange, setLiveByExchange] = useState<Partial<Record<StockExchangeCode, DemoStockRow[]>>>({});
  const [counts, setCounts] = useState<Partial<Record<StockExchangeCode, number>>>({});

  useEffect(() => {
    fetchPublicData<DemoStockRow & { exchange?: string }>("stocks", {
      select: ["symbol", "exchange", "exchange_ticker", "name", "sector", "price", "day_change_percent", "volume", "currency"],
      order: "sort_order.asc",
      limit: 200,
    })
      .then(({ data }) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const grouped: Partial<Record<StockExchangeCode, DemoStockRow[]>> = {};
        const tally: Partial<Record<StockExchangeCode, number>> = {};
        for (const r of data) {
          const ex = (r.exchange || "NSE").toUpperCase() as StockExchangeCode;
          grouped[ex] = grouped[ex] || [];
          grouped[ex]!.push({
            symbol: r.symbol,
            exchange_ticker: r.exchange_ticker || r.symbol,
            name: r.name,
            sector: r.sector,
            price: Number(r.price),
            day_change_percent: Number(r.day_change_percent),
            volume: Number(r.volume),
            currency: r.currency || "KES",
          });
          tally[ex] = (tally[ex] ?? 0) + 1;
        }
        setLiveByExchange(grouped);
        setCounts(tally);
      })
      .catch(() => {});
  }, []);

  const getStats = (ex: StockExchangeCode) => {
    const live = liveByExchange[ex];
    if (live && live.length > 0) {
      return {
        total: live.length,
        gainers: live.filter((r) => r.day_change_percent > 0).length,
        losers: live.filter((r) => r.day_change_percent < 0).length,
        unchanged: live.filter((r) => r.day_change_percent === 0).length,
      };
    }
    const sample = SAMPLE_BY_EXCHANGE[ex];
    const m = EAST_AFRICAN_MARKETS.find((item) => item.exchange === ex)!;
    return { total: counts[ex] ?? m.defaultCount, ...sample };
  };

  return (
    <div className="min-h-screen bg-background px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <div className="border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
            <Sparkles className="h-3.5 w-3.5" /> Desktop Country Tabs — 3 Interactive Demos
          </div>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            Choose Your Desktop Placement for Kenya · Uganda · Tanzania · Rwanda
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-3xl">
            Click any country tab inside each demo below to test how it looks and feels on desktop.
            All 3 keep mobile untouched and show immediately visible tabs with zero hidden dropdowns.
          </p>
        </div>

        {/* ─── OPTION 1 (RECOMMENDED): Top Header Segmented Flag Bar ─── */}
        <section className="space-y-4 rounded-2xl border-2 border-emerald-500/40 bg-card/40 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Option 1 · Recommended</Badge>
                <h2 className="text-lg font-bold text-foreground">Top Header Segmented Bar (Alongside Live Status)</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sits in the empty left area of the top status bar—completely above Market Summary & Sector tabs so there are never two competing underline bars.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 space-y-5">
            {/* Top Row: Segmented Flag Bar (left) + Live Status (right) */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-muted/40 p-1">
                {EAST_AFRICAN_MARKETS.map((m) => {
                  const active = opt1 === m.exchange;
                  const count = counts[m.exchange] ?? m.defaultCount;
                  return (
                    <button
                      key={m.exchange}
                      type="button"
                      onClick={() => setOpt1(m.exchange)}
                      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                        active
                          ? "bg-background text-foreground shadow-sm border border-border/60"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      }`}
                    >
                      <CountryFlagCircle countryCode={m.countryCode} countryName={m.countryName} size={18} />
                      <span>{m.countryName}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {m.exchange} · {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                LIVE · {EAST_AFRICAN_MARKETS.find((m) => m.exchange === opt1)!.currency}
              </div>
            </div>

            {/* Simulated Sector Tabs below (zero visual clash!) */}
            <div className="flex items-center gap-6 border-b border-border text-[13px] font-medium text-muted-foreground">
              <span className="relative pb-2.5 text-foreground font-semibold">
                All
                <span className="absolute bottom-0 left-0 h-[2px] w-full bg-emerald-500 rounded-t-full" />
              </span>
              <span className="pb-2.5">Banking</span>
              <span className="pb-2.5">Telecommunications</span>
              <span className="pb-2.5">Manufacturing & Allied</span>
              <span className="pb-2.5">Energy & Petroleum</span>
            </div>

            <StaticToolbar {...getStats(opt1)} />
            <PreviewStocksTable exchange={opt1} liveByExchange={liveByExchange} />
          </div>
        </section>

        {/* ─── OPTION 2: 4-Column Interactive Exchange Header Cards ─── */}
        <section className="space-y-4 rounded-2xl border border-border bg-card/40 p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Option 2</Badge>
              <h2 className="text-lg font-bold text-foreground">4-Card East Africa Market Strip (Rich Overview Tabs)</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Gives every country its own mini market card showing Flag, Exchange, Currency, Stock Count, and Gainers/Losers pulse at a glance.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {EAST_AFRICAN_MARKETS.map((m) => {
                const active = opt2 === m.exchange;
                const stats = getStats(m.exchange);
                return (
                  <button
                    key={m.exchange}
                    type="button"
                    onClick={() => setOpt2(m.exchange)}
                    className={`group rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? "border-emerald-500 bg-emerald-500/[0.06] ring-2 ring-emerald-500/20 shadow-sm"
                        : "border-border bg-card hover:border-border/90 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CountryFlagCircle countryCode={m.countryCode} countryName={m.countryName} size={28} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-foreground">{m.countryName}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{m.exchange}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{m.currency}</p>
                        </div>
                      </div>
                      {active ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px]">
                      <span className="font-semibold text-foreground tabular-nums">{stats.total} equities</span>
                      <span className="text-emerald-500 font-medium tabular-nums">
                        {stats.gainers} up · {stats.losers} dn
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <StaticToolbar {...getStats(opt2)} />
            <PreviewStocksTable exchange={opt2} liveByExchange={liveByExchange} />
          </div>
        </section>

        {/* ─── OPTION 3: Clean Editorial Underline Tabs + Market Strip ─── */}
        <section className="space-y-4 rounded-2xl border border-border bg-card/40 p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Option 3</Badge>
              <h2 className="text-lg font-bold text-foreground">Clean Editorial Underline Tabs + Exchange Banner</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Full-width underline market tabs at the very top with a compact sector dropdown inside the toolbar so there is still only one underline bar.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border">
              <div className="flex items-center gap-7">
                {EAST_AFRICAN_MARKETS.map((m) => {
                  const active = opt3 === m.exchange;
                  const count = counts[m.exchange] ?? m.defaultCount;
                  return (
                    <button
                      key={m.exchange}
                      type="button"
                      onClick={() => setOpt3(m.exchange)}
                      className={`relative flex items-center gap-2 pb-3.5 text-sm font-semibold transition-colors ${
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CountryFlagCircle countryCode={m.countryCode} countryName={m.countryName} size={20} />
                      <span>{m.countryName}</span>
                      <span className="text-xs font-normal text-muted-foreground">({m.exchange})</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                        active ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
                      }`}>
                        {count}
                      </span>
                      {active && (
                        <span className="absolute bottom-0 left-0 h-[2.5px] w-full rounded-t-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <span className="pb-3.5 text-xs font-medium text-muted-foreground">
                Showing {EAST_AFRICAN_MARKETS.find((m) => m.exchange === opt3)!.exchangeName} ·{" "}
                {EAST_AFRICAN_MARKETS.find((m) => m.exchange === opt3)!.currency}
              </span>
            </div>

            <StaticToolbar {...getStats(opt3)} />
            <PreviewStocksTable exchange={opt3} liveByExchange={liveByExchange} />
          </div>
        </section>
      </div>
    </div>
  );
}
