export interface Fund {
  id: string;
  name: string;
  slug: string;
  manager: string;
  fund_type: string;
  description: string;
  annual_yield: number;
  seven_day_yield: number;
  thirty_day_yield: number;
  daily_yield: number;
  yield_unit: string;
  minimum_investment: number;
  management_fee: number;
  withdrawal_time: string;
  website: string;
  cma_licensed: boolean;
  fact_sheet_date: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  logo_url: string | null;
}

export interface Stock {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  day_change: number;
  day_change_percent: number;
  volume: number;
  market_cap: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  year_high: number | null;
  year_low: number | null;
  sector: string;
  is_active: boolean;
  updated_at: string;
}

export interface ExchangeRate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  day_change_percent?: number | null;
  updated_at: string;
}

export interface Commodity {
  id: string;
  name: string;
  symbol: string;
  price: number;
  previous_price: number | null;
  unit: string;
  day_change_percent?: number | null;
  updated_at: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  category: string;
  source: string;
  url: string | null;
  date_published: string;
  read_time: string;
  is_featured: boolean;
}
