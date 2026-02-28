export interface Fund {
  id: string;
  name: string;
  manager: string;
  annualYield: number;
  sevenDayYield: number;
  thirtyDayYield: number;
  minimumInvestment: number;
  managementFee: number;
  withdrawalTime: string;
  description: string;
  website: string;
  historicalYields: { month: string; yield: number }[];
}

export const funds: Fund[] = [
  {
    id: "cic-mmf",
    name: "CIC Money Market Fund",
    manager: "CIC Asset Management",
    annualYield: 16.2,
    sevenDayYield: 15.8,
    thirtyDayYield: 16.0,
    minimumInvestment: 1000,
    managementFee: 2.0,
    withdrawalTime: "1-2 business days",
    description: "The CIC Money Market Fund invests in short-term, high-quality money market instruments. It aims to provide competitive returns while maintaining high levels of liquidity and capital preservation.",
    website: "https://cic.co.ke",
    historicalYields: [
      { month: "Aug 2024", yield: 15.5 }, { month: "Sep 2024", yield: 15.7 },
      { month: "Oct 2024", yield: 15.9 }, { month: "Nov 2024", yield: 16.0 },
      { month: "Dec 2024", yield: 16.1 }, { month: "Jan 2025", yield: 16.2 },
    ],
  },
  {
    id: "sanlam-mmf",
    name: "Sanlam Money Market Fund",
    manager: "Sanlam Investments East Africa",
    annualYield: 15.8,
    sevenDayYield: 15.5,
    thirtyDayYield: 15.7,
    minimumInvestment: 2500,
    managementFee: 2.0,
    withdrawalTime: "1-2 business days",
    description: "The Sanlam Money Market Fund offers investors a low-risk investment vehicle that provides attractive returns while maintaining capital stability and easy access to funds.",
    website: "https://sfrfinancialservices.co.ke",
    historicalYields: [
      { month: "Aug 2024", yield: 14.9 }, { month: "Sep 2024", yield: 15.1 },
      { month: "Oct 2024", yield: 15.3 }, { month: "Nov 2024", yield: 15.5 },
      { month: "Dec 2024", yield: 15.7 }, { month: "Jan 2025", yield: 15.8 },
    ],
  },
  {
    id: "britam-mmf",
    name: "Britam Money Market Fund",
    manager: "Britam Asset Managers",
    annualYield: 15.5,
    sevenDayYield: 15.2,
    thirtyDayYield: 15.4,
    minimumInvestment: 1000,
    managementFee: 1.5,
    withdrawalTime: "T+1 business day",
    description: "Britam Money Market Fund is designed for investors seeking capital preservation with competitive returns. The fund invests in treasury bills, fixed deposits, and other short-term instruments.",
    website: "https://britam.com",
    historicalYields: [
      { month: "Aug 2024", yield: 14.8 }, { month: "Sep 2024", yield: 15.0 },
      { month: "Oct 2024", yield: 15.1 }, { month: "Nov 2024", yield: 15.3 },
      { month: "Dec 2024", yield: 15.4 }, { month: "Jan 2025", yield: 15.5 },
    ],
  },
  {
    id: "oldmutual-mmf",
    name: "Old Mutual Money Market Fund",
    manager: "Old Mutual Investment Group",
    annualYield: 15.3,
    sevenDayYield: 15.0,
    thirtyDayYield: 15.2,
    minimumInvestment: 5000,
    managementFee: 2.0,
    withdrawalTime: "1-2 business days",
    description: "Old Mutual Money Market Fund provides a secure, high-yield investment option. It primarily invests in government securities and bank deposits to ensure capital safety.",
    website: "https://oldmutual.co.ke",
    historicalYields: [
      { month: "Aug 2024", yield: 14.5 }, { month: "Sep 2024", yield: 14.7 },
      { month: "Oct 2024", yield: 14.9 }, { month: "Nov 2024", yield: 15.1 },
      { month: "Dec 2024", yield: 15.2 }, { month: "Jan 2025", yield: 15.3 },
    ],
  },
  {
    id: "cytonn-mmf",
    name: "Cytonn Money Market Fund",
    manager: "Cytonn Asset Managers",
    annualYield: 17.1,
    sevenDayYield: 16.8,
    thirtyDayYield: 17.0,
    minimumInvestment: 1000,
    managementFee: 2.5,
    withdrawalTime: "2-3 business days",
    description: "Cytonn Money Market Fund aims to deliver above-market returns by investing in a diversified portfolio of money market instruments, with a focus on high-yielding fixed income securities.",
    website: "https://cytonn.com",
    historicalYields: [
      { month: "Aug 2024", yield: 16.5 }, { month: "Sep 2024", yield: 16.7 },
      { month: "Oct 2024", yield: 16.8 }, { month: "Nov 2024", yield: 16.9 },
      { month: "Dec 2024", yield: 17.0 }, { month: "Jan 2025", yield: 17.1 },
    ],
  },
  {
    id: "genafric-mmf",
    name: "GenAfrica Money Market Fund",
    manager: "GenAfrica Asset Managers",
    annualYield: 14.9,
    sevenDayYield: 14.6,
    thirtyDayYield: 14.8,
    minimumInvestment: 1000,
    managementFee: 1.8,
    withdrawalTime: "1-2 business days",
    description: "GenAfrica Money Market Fund offers investors a well-managed, diversified portfolio of short-term money market instruments with competitive yields and daily accrual of interest.",
    website: "https://genafrica.com",
    historicalYields: [
      { month: "Aug 2024", yield: 14.2 }, { month: "Sep 2024", yield: 14.4 },
      { month: "Oct 2024", yield: 14.5 }, { month: "Nov 2024", yield: 14.7 },
      { month: "Dec 2024", yield: 14.8 }, { month: "Jan 2025", yield: 14.9 },
    ],
  },
  {
    id: "nabo-mmf",
    name: "Nabo Africa Money Market Fund",
    manager: "Nabo Capital",
    annualYield: 15.0,
    sevenDayYield: 14.7,
    thirtyDayYield: 14.9,
    minimumInvestment: 5000,
    managementFee: 2.0,
    withdrawalTime: "1-2 business days",
    description: "Nabo Africa Money Market Fund is designed for prudent investors who want to earn competitive returns on their short-term investments while preserving capital.",
    website: "https://nabocapital.com",
    historicalYields: [
      { month: "Aug 2024", yield: 14.3 }, { month: "Sep 2024", yield: 14.5 },
      { month: "Oct 2024", yield: 14.6 }, { month: "Nov 2024", yield: 14.8 },
      { month: "Dec 2024", yield: 14.9 }, { month: "Jan 2025", yield: 15.0 },
    ],
  },
  {
    id: "kuza-mmf",
    name: "Kuza Money Market Fund",
    manager: "ICEA LION Asset Management",
    annualYield: 15.6,
    sevenDayYield: 15.3,
    thirtyDayYield: 15.5,
    minimumInvestment: 2000,
    managementFee: 2.0,
    withdrawalTime: "1-2 business days",
    description: "Kuza Money Market Fund by ICEA LION provides a balanced approach to money market investing with competitive yields and strong fund management oversight.",
    website: "https://icealion.com",
    historicalYields: [
      { month: "Aug 2024", yield: 15.0 }, { month: "Sep 2024", yield: 15.1 },
      { month: "Oct 2024", yield: 15.2 }, { month: "Nov 2024", yield: 15.4 },
      { month: "Dec 2024", yield: 15.5 }, { month: "Jan 2025", yield: 15.6 },
    ],
  },
];

export const newsArticles = [
  {
    id: "1",
    title: "MMF Yields Rise This Month",
    summary: "Money Market Fund yields in Kenya have seen a notable increase this month, with several funds posting their highest returns in recent history driven by rising Treasury bill rates.",
    date: "2025-01-15",
    category: "Yield Updates" as const,
  },
  {
    id: "2",
    title: "How Treasury Bill Rates Are Affecting MMFs",
    summary: "An analysis of how the Central Bank of Kenya's monetary policy decisions and Treasury bill auction rates are directly impacting returns across Kenyan Money Market Funds.",
    date: "2025-01-10",
    category: "Market News" as const,
  },
  {
    id: "3",
    title: "New Guidelines from the Capital Markets Authority",
    summary: "The Capital Markets Authority of Kenya has released updated guidelines for money market fund managers, aimed at enhancing transparency and investor protection.",
    date: "2025-01-05",
    category: "Regulatory Updates" as const,
  },
  {
    id: "4",
    title: "Cytonn MMF Posts Highest Yield in Q4 2024",
    summary: "Cytonn Money Market Fund has recorded the highest yield among Kenyan MMFs for the fourth quarter of 2024, outperforming peers with a 17.1% annual effective yield.",
    date: "2024-12-28",
    category: "Fund Announcements" as const,
  },
  {
    id: "5",
    title: "Digital Platforms Make MMF Investing Easier",
    summary: "More Kenyans are accessing money market funds through mobile apps and digital platforms, lowering the barrier to entry for first-time investors across the country.",
    date: "2024-12-20",
    category: "Market News" as const,
  },
  {
    id: "6",
    title: "Understanding Withholding Tax on MMF Returns",
    summary: "A comprehensive guide to how withholding tax applies to money market fund returns in Kenya, and what investors should know about their net yields after tax.",
    date: "2024-12-15",
    category: "Regulatory Updates" as const,
  },
];

export const faqItems = [
  {
    question: "What is a Money Market Fund?",
    answer: "A Money Market Fund (MMF) is a type of collective investment scheme that pools money from multiple investors to invest in short-term, low-risk financial instruments such as Treasury bills, commercial paper, and fixed deposits. In Kenya, MMFs are regulated by the Capital Markets Authority (CMA) and are designed to offer better returns than traditional savings accounts while maintaining high liquidity.",
  },
  {
    question: "How is interest calculated on MMFs?",
    answer: "Interest on Money Market Funds in Kenya is typically calculated on a daily accrual basis, meaning your returns compound daily. The fund manager invests the pooled funds in money market instruments and distributes the returns proportionally to each investor based on their share of the total fund. The annual effective yield you see advertised accounts for this compounding effect.",
  },
  {
    question: "Are MMFs safe in Kenya?",
    answer: "Money Market Funds in Kenya are considered relatively safe investments. They are regulated by the Capital Markets Authority (CMA) and are required to invest in high-quality, short-term instruments. While they are not guaranteed by the government like bank deposits (which are covered by KDIC up to KES 500,000), MMFs have a strong track record of capital preservation. The key is to choose funds managed by reputable, licensed fund managers.",
  },
  {
    question: "What are the risks of investing in MMFs?",
    answer: "While MMFs are low-risk, they are not entirely risk-free. Key risks include: Credit risk (the possibility that issuers of underlying securities default), Interest rate risk (yields can fluctuate with market conditions), Liquidity risk (in rare cases, large redemptions could affect fund operations), and Regulatory risk (changes in regulations could impact returns). However, diversification requirements and CMA oversight help mitigate these risks significantly.",
  },
  {
    question: "How do MMFs compare to savings accounts?",
    answer: "Money Market Funds in Kenya typically offer significantly higher returns than traditional savings accounts. While most bank savings accounts offer 1-5% annually, MMFs currently yield between 14-17% annually. MMFs also offer daily compounding, lower minimum investments in many cases, and easy withdrawal. However, bank deposits have the advantage of KDIC insurance coverage up to KES 500,000, which MMFs do not have.",
  },
  {
    question: "Is interest from MMFs taxable in Kenya?",
    answer: "Yes, returns from Money Market Funds in Kenya are subject to withholding tax. Currently, a 15% withholding tax is applied on the interest earned from MMFs. This tax is deducted at source by the fund manager before distributing returns to investors. The yields advertised by most funds are typically the gross yields before tax, so your net returns will be slightly lower after the withholding tax deduction.",
  },
];
