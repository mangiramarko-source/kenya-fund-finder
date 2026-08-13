import { useQuery } from "@tanstack/react-query";

export interface TreasuryBond {
  id: string;
  issueNo: string;
  isin: string;
  couponRate: number;
  valueDate: string;
  maturityDate: string;
  tenorYears: number;
  status: "OPEN" | "CLOSED" | "Active" | "Tax-Free" | "New Issue";
  name: string;
  amountIssued: string;
  explanation: string;
}

export interface TBillAuction {
  id: string;
  type: "91-Day" | "182-Day" | "364-Day";
  days: number;
  approx: string;
  auctionDate: string;
  valueDate: string;
  amountOffered: string;
  bidsReceived: string;
  performanceRate: number;
  acceptedAmount: string;
  averageYield: number;
  previousYield: number;
  minInvestment: string;
}

export interface RateHistoryPoint {
  date: string;
  rate91?: number;
  rate182?: number;
  rate364?: number;
  rate?: number;
  label?: string;
}

export type RateHistoryMap = Record<string, RateHistoryPoint[]>;

interface TreasuryData {
  bonds: TreasuryBond[];
  tbills: TBillAuction[];
  rateHistory: RateHistoryMap;
}

const mockBonds: TreasuryBond[] = [
  {
    id: "bond-1",
    issueNo: "FXD1/2024/010",
    name: "10-Year Fixed Rate Treasury Bond",
    couponRate: 13.0,
    maturityDate: "15 Mar 2034",
    tenorYears: 7.6,
    status: "Active",
    valueDate: "18 Mar 2024",
    isin: "KE5000005432",
    amountIssued: "KSh 45.0B",
    explanation:
      "This bond allows you to lend money to the Kenyan government. In return, the government pays interest based on the bond's coupon and repays the principal at maturity.",
  },
  {
    id: "bond-2",
    issueNo: "IFB1/2024/008.5",
    name: "8.5-Year Tax-Exempt Infrastructure Bond",
    couponRate: 14.3,
    maturityDate: "20 Sep 2032",
    tenorYears: 6.1,
    status: "Tax-Free",
    valueDate: "24 Feb 2024",
    isin: "KE5000006789",
    amountIssued: "KSh 70.0B",
    explanation:
      "Infrastructure bonds (IFB) are 100% tax-free in Kenya. Interest earned is exempt from withholding tax, making them highly attractive to long-term investors.",
  },
  {
    id: "bond-3",
    issueNo: "FXD2/2022/015",
    name: "15-Year Fixed Rate Treasury Bond",
    couponRate: 13.94,
    maturityDate: "08 Apr 2037",
    tenorYears: 10.6,
    status: "Active",
    valueDate: "11 Apr 2022",
    isin: "KE5000004111",
    amountIssued: "KSh 32.5B",
    explanation:
      "Long-term benchmark bond offering predictable semi-annual coupon payments for institutional and retail investors seeking decade-long income.",
  },
  {
    id: "bond-4",
    issueNo: "FXD1/2021/020",
    name: "20-Year Fixed Rate Treasury Bond",
    couponRate: 13.44,
    maturityDate: "22 Jul 2041",
    tenorYears: 14.9,
    status: "Active",
    valueDate: "26 Jul 2021",
    isin: "KE5000003002",
    amountIssued: "KSh 28.0B",
    explanation:
      "Ultra-long duration government security designed for long-term wealth preservation, retirement planning, and pension fund asset matching.",
  },
  {
    id: "bond-5",
    issueNo: "IFB1/2023/007",
    name: "7-Year Tax-Exempt Infrastructure Bond",
    couponRate: 15.84,
    maturityDate: "17 Jun 2030",
    tenorYears: 3.8,
    status: "Tax-Free",
    valueDate: "20 Jun 2023",
    isin: "KE5000005999",
    amountIssued: "KSh 60.0B",
    explanation:
      "High-coupon tax-free infrastructure paper funding national roads and water infrastructure. Yields are 100% tax-free under Kenyan law.",
  },
];

const mockTBills: TBillAuction[] = [
  {
    id: "91-day",
    type: "91-Day",
    days: 91,
    approx: "Approx. 3 months",
    auctionDate: "08 Aug 2026",
    valueDate: "10 Aug 2026",
    amountOffered: "KSh 4.0B",
    bidsReceived: "KSh 5.6B",
    performanceRate: 140, // 5.6 / 4.0
    acceptedAmount: "KSh 5.1B",
    averageYield: 8.12,
    previousYield: 8.04,
    minInvestment: "KSh 50,000",
  },
  {
    id: "182-day",
    type: "182-Day",
    days: 182,
    approx: "Approx. 6 months",
    auctionDate: "08 Aug 2026",
    valueDate: "10 Aug 2026",
    amountOffered: "KSh 10.0B",
    bidsReceived: "KSh 12.0B",
    performanceRate: 120, // 12.0 / 10.0
    acceptedAmount: "KSh 9.7B",
    averageYield: 8.34,
    previousYield: 8.37,
    minInvestment: "KSh 50,000",
  },
  {
    id: "364-day",
    type: "364-Day",
    days: 364,
    approx: "Approx. 1 year",
    auctionDate: "08 Aug 2026",
    valueDate: "10 Aug 2026",
    amountOffered: "KSh 10.0B",
    bidsReceived: "KSh 16.0B",
    performanceRate: 160, // 16.0 / 10.0
    acceptedAmount: "KSh 12.3B",
    averageYield: 9.02,
    previousYield: 8.90,
    minInvestment: "KSh 50,000",
  },
];

const historyDataMap: RateHistoryMap = {
  "1M": [
    { date: "Jul 15", rate91: 8.01, rate182: 8.32, rate364: 8.85 },
    { date: "Jul 22", rate91: 8.04, rate182: 8.31, rate364: 8.90 },
    { date: "Jul 29", rate91: 8.07, rate182: 8.35, rate364: 8.95 },
    { date: "Aug 05", rate91: 8.10, rate182: 8.36, rate364: 8.99 },
    { date: "Aug 08", rate91: 8.12, rate182: 8.34, rate364: 9.02 },
  ],
  "3M": [
    { date: "May 15", rate91: 7.85, rate182: 8.15, rate364: 8.60 },
    { date: "Jun 01", rate91: 7.92, rate182: 8.20, rate364: 8.72 },
    { date: "Jun 15", rate91: 7.98, rate182: 8.25, rate364: 8.80 },
    { date: "Jul 01", rate91: 8.02, rate182: 8.30, rate364: 8.88 },
    { date: "Jul 15", rate91: 8.01, rate182: 8.32, rate364: 8.85 },
    { date: "Aug 08", rate91: 8.12, rate182: 8.34, rate364: 9.02 },
  ],
  "6M": [
    { date: "Feb 15", rate91: 7.60, rate182: 7.95, rate364: 8.40 },
    { date: "Mar 15", rate91: 7.72, rate182: 8.05, rate364: 8.52 },
    { date: "Apr 15", rate91: 7.80, rate182: 8.10, rate364: 8.65 },
    { date: "May 15", rate91: 7.85, rate182: 8.15, rate364: 8.60 },
    { date: "Jun 15", rate91: 7.98, rate182: 8.25, rate364: 8.80 },
    { date: "Aug 08", rate91: 8.12, rate182: 8.34, rate364: 9.02 },
  ],
  "1Y": [
    { date: "Aug 2025", rate91: 7.20, rate182: 7.50, rate364: 8.10 },
    { date: "Nov 2025", rate91: 7.45, rate182: 7.75, rate364: 8.30 },
    { date: "Feb 2026", rate91: 7.60, rate182: 7.95, rate364: 8.40 },
    { date: "May 2026", rate91: 7.85, rate182: 8.15, rate364: 8.60 },
    { date: "Aug 2026", rate91: 8.12, rate182: 8.34, rate364: 9.02 },
  ],
  "5Y": [
    { date: "2022", rate91: 6.80, rate182: 7.10, rate364: 7.75 },
    { date: "2023", rate91: 9.50, rate182: 10.10, rate364: 10.80 },
    { date: "2024", rate91: 14.80, rate182: 15.20, rate364: 15.90 },
    { date: "2025", rate91: 9.10, rate182: 9.40, rate364: 10.00 },
    { date: "2026", rate91: 8.12, rate182: 8.34, rate364: 9.02 },
  ],
};

const fetchTreasuryData = async (): Promise<TreasuryData> => {
  // Simulate network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        bonds: mockBonds,
        tbills: mockTBills,
        rateHistory: historyDataMap,
      });
    }, 1500);
  });
};

export const useTreasuryData = () => {
  return useQuery({
    queryKey: ["treasury-data"],
    queryFn: fetchTreasuryData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
