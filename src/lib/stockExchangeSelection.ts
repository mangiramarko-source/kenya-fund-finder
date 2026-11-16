import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { StockCountryCode, StockCurrencyCode, StockExchangeCode } from "@/lib/stockCache";

export const STOCK_EXCHANGE_STORAGE_KEY = "kff:stocks:exchange";
export const STOCK_EXCHANGE_CHANGE_EVENT = "kff:stock-exchange-change";

export interface EastAfricanMarketMeta {
  exchange: StockExchangeCode;
  countryCode: StockCountryCode;
  countryName: string;
  adjective: string;
  exchangeName: string;
  currency: StockCurrencyCode;
  currencySymbol: string;
  defaultCount: number;
  gateTitle: string;
}

export const EAST_AFRICAN_MARKETS: readonly EastAfricanMarketMeta[] = [
  {
    exchange: "NSE",
    countryCode: "KE",
    countryName: "Kenya",
    adjective: "Kenyan",
    exchangeName: "Nairobi Securities Exchange",
    currency: "KES",
    currencySymbol: "KSh",
    defaultCount: 45,
    gateTitle: "Unlock All NSE Stocks & Live Market Data",
  },
  {
    exchange: "USE",
    countryCode: "UG",
    countryName: "Uganda",
    adjective: "Ugandan",
    exchangeName: "Uganda Securities Exchange",
    currency: "UGX",
    currencySymbol: "USh",
    defaultCount: 18,
    gateTitle: "Unlock All USE Uganda Stocks & Market Data",
  },
  {
    exchange: "DSE",
    countryCode: "TZ",
    countryName: "Tanzania",
    adjective: "Tanzanian",
    exchangeName: "Dar es Salaam Stock Exchange",
    currency: "TZS",
    currencySymbol: "TSh",
    defaultCount: 26,
    gateTitle: "Unlock All DSE Tanzania Stocks & Market Data",
  },
  {
    exchange: "RSE",
    countryCode: "RW",
    countryName: "Rwanda",
    adjective: "Rwandan",
    exchangeName: "Rwanda Stock Exchange",
    currency: "RWF",
    currencySymbol: "FRw",
    defaultCount: 10,
    gateTitle: "Unlock All RSE Rwanda Stocks & Market Data",
  },
] as const;

const EXCHANGE_MAP = new Map<StockExchangeCode, EastAfricanMarketMeta>(
  EAST_AFRICAN_MARKETS.map((m) => [m.exchange, m]),
);

const COUNTRY_TO_EXCHANGE: Record<string, StockExchangeCode> = {
  KE: "NSE",
  KENYA: "NSE",
  UG: "USE",
  UGANDA: "USE",
  TZ: "DSE",
  TANZANIA: "DSE",
  RW: "RSE",
  RWANDA: "RSE",
};

export function parseStockExchangeCode(raw?: string | null): StockExchangeCode | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (EXCHANGE_MAP.has(upper as StockExchangeCode)) {
    return upper as StockExchangeCode;
  }
  return COUNTRY_TO_EXCHANGE[upper] ?? null;
}

export function getEastAfricanMarketMeta(exchange?: string | null): EastAfricanMarketMeta {
  const code = parseStockExchangeCode(exchange) ?? "NSE";
  return EXCHANGE_MAP.get(code)!;
}

export function readStoredStockExchange(): StockExchangeCode {
  try {
    const saved = localStorage.getItem(STOCK_EXCHANGE_STORAGE_KEY);
    return parseStockExchangeCode(saved) ?? "NSE";
  } catch {
    return "NSE";
  }
}

export function writeStoredStockExchange(exchange: StockExchangeCode) {
  try {
    localStorage.setItem(STOCK_EXCHANGE_STORAGE_KEY, exchange);
  } catch {
    // Storage may be unavailable in private browsing mode.
  }
}

export function resolveSelectedStockExchange(search = ""): StockExchangeCode {
  const params = new URLSearchParams(search);
  const fromQuery =
    parseStockExchangeCode(params.get("exchange")) ??
    parseStockExchangeCode(params.get("country"));
  if (fromQuery) {
    return fromQuery;
  }
  return readStoredStockExchange();
}

export function buildStocksRouteUrl(exchange: StockExchangeCode, currentSearch = ""): string {
  const params = new URLSearchParams(currentSearch);
  params.delete("country");
  if (exchange === "NSE") {
    params.delete("exchange");
  } else {
    params.set("exchange", exchange);
  }
  const qs = params.toString();
  return qs ? `/stocks?${qs}` : "/stocks";
}

export function useSelectedStockExchange() {
  const location = useLocation();
  const navigate = useNavigate();

  const [selectedExchange, setSelectedExchangeState] = useState<StockExchangeCode>(() =>
    resolveSelectedStockExchange(location.search),
  );

  // Keep state aligned when URL query params change or another instance dispatches change
  useEffect(() => {
    const next = resolveSelectedStockExchange(location.search);
    setSelectedExchangeState(next);
    if (location.pathname === "/stocks" || location.pathname === "/stocks/") {
      writeStoredStockExchange(next);
      // Reflect persisted non-NSE exchange into /stocks URL when returning from another tab
      const params = new URLSearchParams(location.search);
      const urlEx = parseStockExchangeCode(params.get("exchange")) ?? parseStockExchangeCode(params.get("country"));
      if (!urlEx && next !== "NSE") {
        const target = buildStocksRouteUrl(next, location.search);
        navigate(target, { replace: true });
      }
    }
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const handleCustom = (event: Event) => {
      const detail = (event as CustomEvent<StockExchangeCode>).detail;
      const parsed = parseStockExchangeCode(detail);
      if (parsed) setSelectedExchangeState(parsed);
    };
    window.addEventListener(STOCK_EXCHANGE_CHANGE_EVENT, handleCustom);
    return () => window.removeEventListener(STOCK_EXCHANGE_CHANGE_EVENT, handleCustom);
  }, []);

  const setSelectedExchange = useCallback(
    (exchange: StockExchangeCode) => {
      writeStoredStockExchange(exchange);
      setSelectedExchangeState(exchange);
      window.dispatchEvent(
        new CustomEvent<StockExchangeCode>(STOCK_EXCHANGE_CHANGE_EVENT, { detail: exchange }),
      );
      if (location.pathname === "/stocks" || location.pathname === "/stocks/") {
        const nextUrl = buildStocksRouteUrl(exchange, location.search);
        const currentUrl = `${location.pathname}${location.search}`;
        if (nextUrl !== currentUrl) {
          navigate(nextUrl, { replace: true });
        }
      }
    },
    [location.pathname, location.search, navigate],
  );

  return {
    selectedExchange,
    market: getEastAfricanMarketMeta(selectedExchange),
    setSelectedExchange,
  };
}
