export interface FundUnitPriceCandidate {
  yield_unit?: string | null;
  fund_type?: string | null;
  annual_yield?: number | null;
}

/**
 * Returns true if the fund represents a Net Asset Value (NAV) unit price in KES
 * rather than an annual interest yield.
 *
 * Balanced and equity funds often have their NAV per share (e.g., 107.66 KES)
 * stored in the annual_yield field. These should NOT be formatted as percentage rates,
 * should NOT be sorted as interest rates, and should NOT have 15% withholding tax deducted.
 */
export function isUnitPriceFund(fund: FundUnitPriceCandidate | null | undefined): boolean {
  if (!fund) return false;
  const unit = String(fund.yield_unit || "").trim().toUpperCase();
  if (unit === "KES") return true;

  const fundType = String(fund.fund_type || "").trim().toLowerCase();
  const yieldNum = Number(fund.annual_yield);
  if ((fundType === "balanced" || fundType === "equity") && Number.isFinite(yieldNum) && yieldNum > 35) {
    return true;
  }

  return false;
}
