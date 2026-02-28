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
    title: "MMF Yields Continue Upward Trend as CBK Holds Rates Steady",
    summary: "Money Market Fund yields in Kenya have maintained their upward trajectory, with the average annual effective yield across CMA-regulated funds now sitting above 15%. The Central Bank of Kenya's decision to hold the benchmark rate has helped sustain attractive returns for MMF investors, with top-performing funds offering over 17% annually. Analysts expect yields to remain competitive through the first half of 2025.",
    date: "2025-01-15",
    category: "Yield Updates" as const,
    imageKey: "yields" as const,
    readTime: "3 min read",
    featured: true,
  },
  {
    id: "2",
    title: "How Treasury Bill Auction Results Impact Your MMF Returns",
    summary: "Treasury bill rates remain a key driver of MMF performance in Kenya. Recent 91-day T-bill auctions have seen rates hover around 15-16%, directly influencing the returns fund managers can offer investors. Since most Kenyan MMFs allocate a significant portion of their portfolios to government securities, understanding the T-bill market is essential for any MMF investor.",
    date: "2025-01-10",
    category: "Market News" as const,
    imageKey: "treasury" as const,
    readTime: "5 min read",
    featured: false,
  },
  {
    id: "3",
    title: "CMA Strengthens Investor Protection Rules for Fund Managers",
    summary: "The Capital Markets Authority of Kenya has introduced enhanced disclosure requirements for money market fund managers. The new guidelines mandate more frequent reporting of fund composition, clearer fee structures, and improved risk communication to retail investors. These changes aim to boost transparency and build greater confidence in the collective investment scheme industry.",
    date: "2025-01-05",
    category: "Regulatory Updates" as const,
    imageKey: "regulation" as const,
    readTime: "4 min read",
    featured: false,
  },
  {
    id: "4",
    title: "Mobile-First Investing: How Apps Are Opening MMFs to Millions",
    summary: "Digital platforms like M-Pesa's Mali savings, Money Market Fund apps, and investment super-apps are transforming access to money market funds in Kenya. With minimum investments as low as KES 100 on some platforms, more Kenyans than ever can now earn competitive returns on their savings. Industry data shows mobile-initiated MMF investments grew by over 40% in 2024.",
    date: "2024-12-28",
    category: "Market News" as const,
    imageKey: "digital" as const,
    readTime: "4 min read",
    featured: true,
  },
  {
    id: "5",
    title: "MMFs vs Savings Accounts: Why Kenyans Are Making the Switch",
    summary: "With traditional bank savings accounts offering between 1-5% annually compared to MMF yields of 14-17%, the shift is clear. Kenyan investors are increasingly moving idle cash from bank accounts into CMA-regulated money market funds. The combination of daily interest accrual, easy mobile access, and no lock-in periods makes MMFs an attractive alternative for short-term savings.",
    date: "2024-12-20",
    category: "Yield Updates" as const,
    imageKey: "savings" as const,
    readTime: "3 min read",
    featured: false,
  },
  {
    id: "6",
    title: "Understanding the 15% Withholding Tax on MMF Interest",
    summary: "All interest earned from Money Market Funds in Kenya is subject to a 15% withholding tax, deducted at source by the fund manager. This means the yields advertised are typically gross figures — your actual take-home return will be slightly lower. For example, a fund advertising 16% gross yield would deliver approximately 13.6% net after tax. Here's what every investor should know.",
    date: "2024-12-15",
    category: "Regulatory Updates" as const,
    imageKey: "fund" as const,
    readTime: "5 min read",
    featured: false,
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
