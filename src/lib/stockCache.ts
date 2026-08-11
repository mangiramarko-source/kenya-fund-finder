export interface CachedStock {
  id: string;
  symbol: string;
  name: string;
  sector: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  year_high: number | null;
  year_low: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  updated_at: string;
}

const STOCKS_KEY = "kff:cache:stocks:v1";

interface StockCacheEnvelope {
  savedAt: number;
  data: CachedStock[];
}

export const normalizeStock = (stock: any): CachedStock => ({
  ...stock,
  price: Number(stock.price),
  previous_price: stock.previous_price != null ? Number(stock.previous_price) : null,
  day_change: Number(stock.day_change),
  day_change_percent: Number(stock.day_change_percent),
  volume: Number(stock.volume),
  market_cap: stock.market_cap != null ? Number(stock.market_cap) : null,
  year_high: stock.year_high != null ? Number(stock.year_high) : null,
  year_low: stock.year_low != null ? Number(stock.year_low) : null,
  pe_ratio: stock.pe_ratio != null ? Number(stock.pe_ratio) : null,
  dividend_yield: stock.dividend_yield != null ? Number(stock.dividend_yield) : null,
});

const readStocks = (): StockCacheEnvelope | null => {
  try {
    const raw = localStorage.getItem(STOCKS_KEY);
    return raw ? JSON.parse(raw) as StockCacheEnvelope : null;
  } catch {
    return null;
  }
};

const writeStocks = (stocks: CachedStock[]) => {
  try {
    localStorage.setItem(STOCKS_KEY, JSON.stringify({ savedAt: Date.now(), data: stocks }));
  } catch {
    // Storage may be unavailable in private browsing mode.
  }
};

export const stockCache = {
  loadStocks(): { stocks: CachedStock[]; savedAt: number } | null {
    const cached = readStocks();
    return cached ? { stocks: cached.data, savedAt: cached.savedAt } : null;
  },
  saveStocks(stocks: CachedStock[]) {
    if (stocks.length > 0) writeStocks(stocks);
  },
  upsertStock(stock: CachedStock) {
    const existing = readStocks()?.data ?? [];
    const next = existing.filter((item) => item.id !== stock.id && item.symbol !== stock.symbol);
    writeStocks([...next, stock]);
  },
};
