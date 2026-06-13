import type { FundType } from "./api";

/**
 * Factual, neutral, plain-English descriptions of how each fund category works.
 * No suitability statements, no recommendations.
 */
export const FUND_TYPE_EXPLAINERS: Record<FundType, string> = {
  money_market:
    "Money Market Funds (MMFs) pool investor money to buy short-term debt instruments such as Treasury bills, commercial paper, and bank fixed deposits. The fund's yield reflects the interest earned on these instruments, after the manager's fee. Yields are typically quoted as an annualised effective rate and accrue daily. Investors usually receive their money back within a few business days of a redemption request.",

  fixed_income:
    "Fixed Income Funds invest mainly in interest-paying instruments such as government and corporate bonds, Treasury bills, and bank deposits. The fund's value can rise or fall as interest rates and bond prices change. Returns generally come from a combination of interest income and changes in the market value of the underlying instruments.",

  balanced:
    "Balanced Funds hold a mix of shares (equities) and interest-paying instruments (such as bonds and Treasury bills) within a single portfolio. The fund manager adjusts the mix over time. Returns depend on both stock market movements and interest income, so the value of the fund can move up or down day to day.",

  equity:
    "Equity Funds invest mainly in shares listed on stock exchanges, including the Nairobi Securities Exchange (NSE). The fund's value moves with the prices of the shares it holds, which can rise or fall significantly in the short term. Returns generally come from share price changes and any dividends the underlying companies pay.",

  bond:
    "Bond Funds invest primarily in government and corporate bonds. The fund earns interest from the bonds it holds and may also gain or lose value as bond prices move with interest rates. The mix of bond maturities and issuers determines how sensitive the fund is to interest rate changes.",

  special:
    "Special Funds include thematic, Shariah-compliant, high-yield, and other specialised mandates that may invest across asset classes. The strategy, holdings, and risk profile vary significantly between funds in this category — read each fund's fact sheet for specifics.",
};

export function getFundExplainer(fundType?: FundType): string {
  if (fundType && FUND_TYPE_EXPLAINERS[fundType]) {
    return FUND_TYPE_EXPLAINERS[fundType];
  }
  return FUND_TYPE_EXPLAINERS.money_market;
}
