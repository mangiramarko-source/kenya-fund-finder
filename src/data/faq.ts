import type { FundType } from "@/lib/api";

export interface FaqItem {
  question: string;
  answer: string;
}

export const faqByFundType: Record<FundType | "general", FaqItem[]> = {
  general: [
    {
      question: "What is a Collective Investment Scheme (CIS)?",
      answer:
        "A Collective Investment Scheme pools money from multiple investors to invest in a diversified portfolio of assets. In Kenya, CIS are regulated by the Capital Markets Authority (CMA) and include Money Market Funds, Equity Funds, Bond Funds, Fixed Income Funds, and Balanced Funds. Each type has a different risk-return profile suited to different investor goals.",
    },
    {
      question: "How are investment fund returns taxed in Kenya?",
      answer:
        "Returns from investment funds in Kenya are subject to a 15% withholding tax on interest income, deducted at source by the fund manager. Capital gains from equity investments may also attract a 5% capital gains tax. The yields advertised by most funds are typically gross yields before tax. Always consult a tax professional for advice specific to your situation.",
    },
    {
      question: "How do I choose the right fund type?",
      answer:
        "Your choice depends on your investment goals, time horizon, and risk tolerance. Money Market Funds suit short-term, low-risk savings. Fixed Income and Bond Funds offer moderate returns with medium risk. Balanced Funds provide diversification across asset classes. Equity Funds carry higher risk but offer the potential for higher long-term growth. Consider consulting a licensed financial advisor.",
    },
    {
      question: "Are investment funds in Kenya regulated?",
      answer:
        "Yes, all collective investment schemes in Kenya are regulated by the Capital Markets Authority (CMA). Fund managers must be licensed, and funds must comply with investment guidelines, reporting requirements, and investor protection rules. Always verify that a fund and its manager are CMA-licensed before investing.",
    },
  ],

  money_market: [
    {
      question: "What is a Money Market Fund?",
      answer:
        "A Money Market Fund (MMF) is a collective investment scheme that pools money from investors to invest in short-term, low-risk instruments such as Treasury bills, commercial paper, and fixed deposits. In Kenya, MMFs are regulated by the CMA and offer better returns than traditional savings accounts while maintaining high liquidity.",
    },
    {
      question: "How is interest calculated on MMFs?",
      answer:
        "Interest on Money Market Funds is typically calculated on a daily accrual basis — your returns compound daily. The fund manager invests pooled funds in money market instruments and distributes returns proportionally. The annual effective yield accounts for this compounding effect.",
    },
    {
      question: "Are MMFs safe in Kenya?",
      answer:
        "MMFs are considered relatively safe. They are regulated by the CMA and invest in high-quality, short-term instruments. While not guaranteed by the government like bank deposits (covered by KDIC up to KES 500,000), MMFs have a strong track record of capital preservation. Choose funds managed by reputable, licensed fund managers.",
    },
    {
      question: "How do MMFs compare to savings accounts?",
      answer:
        "MMFs typically offer higher returns than bank savings accounts (1–5% p.a.), currently yielding 8–14% annually. They also offer daily compounding, lower minimum investments, and easy withdrawals. However, bank deposits benefit from KDIC insurance up to KES 500,000, which MMFs do not have.",
    },
    {
      question: "What are the risks of Money Market Funds?",
      answer:
        "While low-risk, MMFs are not risk-free. Key risks include credit risk (issuer defaults), interest rate risk (yield fluctuations), liquidity risk (large redemptions affecting operations), and regulatory risk. Diversification requirements and CMA oversight help mitigate these significantly.",
    },
  ],

  fixed_income: [
    {
      question: "What is a Fixed Income Fund?",
      answer:
        "A Fixed Income Fund invests primarily in debt securities — government bonds, corporate bonds, Treasury bills, and fixed deposits. These funds aim to provide regular, predictable income with moderate risk. They are suitable for investors seeking stable returns over a medium-term horizon.",
    },
    {
      question: "How do Fixed Income Funds generate returns?",
      answer:
        "Returns come from two sources: interest (coupon) payments from bonds and other debt instruments, and capital gains when bond prices increase. Fund managers actively manage the portfolio to optimise yield while managing interest rate and credit risk.",
    },
    {
      question: "What is interest rate risk?",
      answer:
        "Interest rate risk is the primary risk for fixed income investors. When market interest rates rise, existing bond prices fall (and vice versa). This means the fund's net asset value can decrease even though the underlying bonds continue to pay interest. Longer-duration bonds are more sensitive to rate changes.",
    },
    {
      question: "How do Fixed Income Funds compare to MMFs?",
      answer:
        "Fixed Income Funds typically invest in longer-term instruments than MMFs, which can offer higher yields but with more price volatility. MMFs focus on capital preservation and liquidity, while Fixed Income Funds balance income generation with moderate capital risk. Fixed Income Funds are better suited for investors with a 1–3 year horizon.",
    },
  ],

  balanced: [
    {
      question: "What is a Balanced Fund?",
      answer:
        "A Balanced Fund (also called a hybrid fund) invests in a mix of equities (shares), fixed income securities (bonds), and sometimes money market instruments. The goal is to provide both capital growth and income by diversifying across asset classes, offering a middle ground between pure equity and pure fixed income funds.",
    },
    {
      question: "What is the typical asset allocation?",
      answer:
        "Kenyan Balanced Funds typically allocate 40–60% to equities and 40–60% to fixed income and cash instruments. The exact mix varies by fund and is adjusted by the fund manager based on market conditions. Some funds maintain a fixed ratio while others actively shift allocations.",
    },
    {
      question: "Who should invest in Balanced Funds?",
      answer:
        "Balanced Funds suit investors who want exposure to equities for growth potential but prefer lower volatility than a pure equity fund. They are ideal for medium-term goals (3–5 years), investors new to equities, or those who want a single diversified fund rather than managing multiple investments.",
    },
    {
      question: "What are the risks of Balanced Funds?",
      answer:
        "Balanced Funds carry moderate risk. The equity portion is subject to stock market volatility, while the fixed income portion faces interest rate risk. However, diversification across asset classes reduces overall portfolio risk compared to a pure equity fund. Returns are not guaranteed and capital may fluctuate.",
    },
  ],

  equity: [
    {
      question: "What is an Equity Fund?",
      answer:
        "An Equity Fund invests primarily in shares of companies listed on stock exchanges such as the Nairobi Securities Exchange (NSE) and sometimes regional or international markets. These funds aim for long-term capital growth and may also provide dividend income.",
    },
    {
      question: "What returns can I expect from Equity Funds?",
      answer:
        "Equity Funds have the potential for the highest long-term returns among fund types but also the highest short-term volatility. Historically, the NSE has delivered 8–15% annual returns over long periods, though individual years can vary dramatically — including negative returns. A 5+ year investment horizon is recommended.",
    },
    {
      question: "How risky are Equity Funds?",
      answer:
        "Equity Funds carry the highest risk among common fund types. Share prices fluctuate based on company performance, economic conditions, political events, and market sentiment. You may receive back less than you invested, especially over short periods. Diversification across many stocks helps reduce individual company risk but not overall market risk.",
    },
    {
      question: "How are Equity Fund returns taxed?",
      answer:
        "Dividend income from Kenyan equities is subject to 15% withholding tax. Capital gains from the sale of shares listed on the NSE attract a 5% capital gains tax on net gains. These taxes are typically handled by the fund manager. Consult a tax advisor for your specific situation.",
    },
  ],

  bond: [
    {
      question: "What is a Bond Fund?",
      answer:
        "A Bond Fund invests primarily in government and corporate bonds. Government bonds (such as Kenya Treasury Bonds) are considered lower risk, while corporate bonds may offer higher yields with additional credit risk. Bond Funds aim to provide regular income and moderate capital appreciation.",
    },
    {
      question: "How do Bond Funds differ from Fixed Income Funds?",
      answer:
        "Bond Funds focus specifically on bonds (government and corporate), while Fixed Income Funds may invest more broadly in other debt instruments like commercial paper, fixed deposits, and Treasury bills. Bond Funds typically have longer average maturities and may experience more price volatility due to interest rate movements.",
    },
    {
      question: "What is credit risk in Bond Funds?",
      answer:
        "Credit risk is the possibility that a bond issuer fails to make interest payments or repay the principal. Government bonds generally have very low credit risk, while corporate bonds carry varying degrees depending on the issuer's financial health. Fund managers assess creditworthiness and diversify to manage this risk.",
    },
    {
      question: "When should I invest in Bond Funds?",
      answer:
        "Bond Funds are suitable for investors seeking regular income with moderate risk over a 2–5 year horizon. They tend to perform well when interest rates are stable or declining. If you expect rates to rise significantly, bond prices may fall, reducing short-term returns. They offer better yields than MMFs with more stability than equity funds.",
    },
  ],
};

/** Flat array of all FAQ items (for backward compatibility / JSON-LD) */
export const faqItems: FaqItem[] = Object.values(faqByFundType).flat();
