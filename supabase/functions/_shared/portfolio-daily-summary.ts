export type PortfolioHolding = {
  id: string;
  user_id: string;
  asset_id: string | null;
  asset_type: string;
  asset_name: string;
  ticker: string | null;
  units: number;
  buy_price: number;
  buy_date: string;
};

export type HoldingValue = PortfolioHolding & { value: number };

export type PreviousHolding = { portfolio_holding_id: string; units: number; value: number; asset_name: string };

export function nairobiDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.filter(({ type }) => type !== "literal").map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function mmfValue(holding: PortfolioHolding, annualYield: number, now = new Date()): number | null {
  if (!Number.isFinite(annualYield) || annualYield < 0 || !Number.isFinite(holding.units) || !Number.isFinite(holding.buy_price)) return null;
  const boughtAt = Date.parse(holding.buy_date);
  if (!Number.isFinite(boughtAt)) return null;
  const days = Math.max(0, Math.floor((now.getTime() - boughtAt) / 86_400_000));
  return holding.units * holding.buy_price * Math.pow(1 + annualYield / 100 / 365, days);
}

export function marketMovement(current: HoldingValue[], previous: PreviousHolding[]) {
  const previousByHolding = new Map(previous.map((item) => [item.portfolio_holding_id, item]));
  const comparable = current.flatMap((holding) => {
    const prior = previousByHolding.get(holding.id);
    if (!prior || Math.abs(prior.units - holding.units) > 1e-9) return [];
    return [{
      holdingId: holding.id,
      assetName: holding.asset_name,
      openingValue: prior.value,
      closingValue: holding.value,
      change: holding.value - prior.value,
    }];
  });
  const openingValue = comparable.reduce((sum, item) => sum + item.openingValue, 0);
  const closingValue = comparable.reduce((sum, item) => sum + item.closingValue, 0);
  const change = closingValue - openingValue;
  return {
    comparable,
    openingValue,
    closingValue,
    change,
    percentChange: openingValue > 0 ? (change / openingValue) * 100 : 0,
    movers: [...comparable].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 2),
  };
}
