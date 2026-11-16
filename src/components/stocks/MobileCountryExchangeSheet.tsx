import { useEffect, useState } from "react";
import { Check, Globe2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchPublicData } from "@/lib/gateway";
import { getCountryFlagUrl } from "@/lib/currencyBranding";
import type { StockExchangeCode } from "@/lib/stockCache";
import { EAST_AFRICAN_MARKETS } from "@/lib/stockExchangeSelection";

interface MobileCountryExchangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedExchange: StockExchangeCode;
  onSelectExchange: (exchange: StockExchangeCode) => void;
}

export function CountryFlagCircle({
  countryCode,
  countryName,
  size = 22,
}: {
  countryCode: string;
  countryName: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const flagUrl = getCountryFlagUrl(countryCode);

  if (flagUrl && !failed) {
    return (
      <img
        src={flagUrl}
        alt={`${countryName} flag`}
        width={size}
        height={size}
        loading="eager"
        decoding="async"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover border border-border/60 shadow-2xs"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted font-bold text-foreground"
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)) }}
    >
      {countryCode}
    </span>
  );
}

let cachedCounts: Partial<Record<StockExchangeCode, number>> | null = null;

export default function MobileCountryExchangeSheet({
  open,
  onOpenChange,
  selectedExchange,
  onSelectExchange,
}: MobileCountryExchangeSheetProps) {
  const [counts, setCounts] = useState<Partial<Record<StockExchangeCode, number>>>(
    () => cachedCounts ?? {},
  );

  useEffect(() => {
    if (!open || cachedCounts) return;
    let cancelled = false;
    fetchPublicData<{ exchange?: string | null }>("stocks", {
      select: ["exchange"],
      limit: 200,
    })
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data) || data.length === 0) return;
        const next: Partial<Record<StockExchangeCode, number>> = {};
        for (const row of data) {
          const ex = (row.exchange || "NSE").toUpperCase() as StockExchangeCode;
          next[ex] = (next[ex] ?? 0) + 1;
        }
        cachedCounts = next;
        setCounts(next);
      })
      .catch(() => {
        // Fall back silently to defaultCount per market
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-[28px] border-x border-t border-border bg-background p-0 shadow-2xl [&>button]:hidden pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        aria-label="Choose East African stock market"
      >
        {/* Drag handle pill */}
        <div
          aria-hidden="true"
          className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"
        />

        {/* Sheet header */}
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Globe2 className="h-4 w-4 text-emerald-500" />
              Choose Market
            </SheetTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Switch between East African stock exchanges
            </p>
          </SheetHeader>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all"
            aria-label="Close market selector"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Country list */}
        <div className="overflow-y-auto px-4 pt-3 pb-2 space-y-2">
          {EAST_AFRICAN_MARKETS.map((market) => {
            const active = selectedExchange === market.exchange;
            const stockCount = counts[market.exchange] ?? market.defaultCount;

            return (
              <button
                key={market.exchange}
                type="button"
                onClick={() => {
                  onSelectExchange(market.exchange);
                  onOpenChange(false);
                }}
                aria-pressed={active}
                data-testid={`country-option-${market.exchange}`}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
                  active
                    ? "border-emerald-500/60 bg-emerald-500/10 dark:bg-emerald-500/15 shadow-xs"
                    : "border-border/70 bg-card hover:bg-muted/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CountryFlagCircle
                    countryCode={market.countryCode}
                    countryName={market.countryName}
                    size={36}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[15px] font-bold text-foreground">
                        {market.countryName}
                      </span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${
                          active
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {market.exchange}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {market.exchangeName}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  <div className="text-right">
                    <span className="block text-xs font-bold tabular-nums text-foreground">
                      {stockCount} stocks
                    </span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {market.currency}
                    </span>
                  </div>
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                      active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-border/70 bg-transparent text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.75]" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
