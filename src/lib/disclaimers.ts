import type { FundType } from "./api";

export const FUND_TYPE_DISCLAIMERS: Record<FundType, string> = {
  money_market:
    "Money Market Funds invest in short-term, low-risk instruments such as Treasury bills, commercial paper, and fixed deposits. Yields shown are gross annual effective rates before the 15% withholding tax unless otherwise stated. While Money Market Funds are considered low-risk, they are not guaranteed by any government or institution. Past performance is not indicative of future results. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.",

  fixed_income:
    "Fixed Income Funds invest primarily in debt securities such as government bonds, corporate bonds, and fixed deposits. These funds are subject to interest rate risk — when interest rates rise, bond prices typically fall, which may reduce the fund's value. Yields shown are gross annual rates before the 15% withholding tax. Past performance is not indicative of future results. Capital is not guaranteed. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.",

  balanced:
    "Balanced Funds invest in a mix of equities (shares) and fixed income instruments (bonds, Treasury bills) to provide both capital growth and income. The value of your investment may go up or down depending on market conditions. These funds carry moderate risk — higher than Money Market Funds but lower than pure Equity Funds. Past performance is not indicative of future results. Capital is not guaranteed. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.",

  equity:
    "Equity Funds invest primarily in shares listed on stock exchanges such as the Nairobi Securities Exchange (NSE). Equity investments are subject to market volatility — the value of your investment can rise or fall significantly in the short term. These funds carry higher risk than fixed income or money market instruments but historically offer higher long-term returns. Past performance is not indicative of future results. Capital is not guaranteed, and you may receive back less than you invested. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.",

  bond:
    "Bond Funds invest primarily in government and corporate bonds. These funds are subject to interest rate risk, credit risk, and liquidity risk. When interest rates rise, bond prices typically fall. The fund's value may fluctuate, and returns are not guaranteed. Yields shown are gross annual rates before the 15% withholding tax. Past performance is not indicative of future results. Capital is not guaranteed. This platform does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.",
};

/**
 * Returns a fund-type-specific disclaimer, or a generic one if no type is provided.
 */
export function getDisclaimer(fundType?: FundType): string {
  if (fundType && FUND_TYPE_DISCLAIMERS[fundType]) {
    return FUND_TYPE_DISCLAIMERS[fundType];
  }
  return "Yields shown are gross annual effective rates before the 15% withholding tax. Past performance is not indicative of future results. Data is sourced from publicly available fund fact sheets and may not reflect real-time values. All investments carry risk, including the potential loss of principal. This platform, operated by Elyon Innovation LTD, does not offer investment advice. Please consult a licensed financial advisor before making investment decisions.";
}
