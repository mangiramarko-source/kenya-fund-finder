import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  lastVerifiedAt?: string;
}

function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  if (amount >= 1e9) return `KSh ${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `KSh ${(amount / 1e6).toFixed(1)}M`;
  return `KSh ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const fetchTreasuryData = async (): Promise<TreasuryData> => {
  // 1. Fetch T-Bills
  const { data: tbillRows, error: tbillError } = await supabase
    .from("treasury_bill_auctions")
    .select("*")
    .order("auction_date", { ascending: false });

  if (tbillError) {
    console.error("Error fetching T-Bill auctions from Supabase:", tbillError);
    throw tbillError;
  }

  if (!tbillRows || tbillRows.length === 0) {
    console.error("No T-Bill data available.");
    throw new Error("No data available");
  }

  // Get latest record per tenor
  const latestByTenor: Record<number, any> = {};
  if (tbillRows) {
    for (const row of tbillRows) {
      if (!latestByTenor[row.tenor_days]) {
        latestByTenor[row.tenor_days] = row;
      }
    }
  }

  const defaultTenors = [
    { tenor: 91, type: "91-Day" as const, approx: "Approx. 3 months", defaultId: "91-day" },
    { tenor: 182, type: "182-Day" as const, approx: "Approx. 6 months", defaultId: "182-day" },
    { tenor: 364, type: "364-Day" as const, approx: "Approx. 1 year", defaultId: "364-day" },
  ];

  const tbills: TBillAuction[] = defaultTenors.map(({ tenor, type, approx, defaultId }) => {
    const row = latestByTenor[tenor];
    if (!row) {
      return {
        id: defaultId,
        type,
        days: tenor,
        approx,
        auctionDate: "—",
        valueDate: "—",
        amountOffered: "—",
        bidsReceived: "—",
        performanceRate: 0,
        acceptedAmount: "—",
        averageYield: 0,
        previousYield: 0,
        minInvestment: "KSh 50,000",
      };
    }

    const perf = row.performance_rate
      ? Number(row.performance_rate)
      : row.bids_received && row.amount_offered
      ? Math.round((Number(row.bids_received) / Number(row.amount_offered)) * 100)
      : 0;

    return {
      id: defaultId,
      type,
      days: tenor,
      approx,
      auctionDate: formatDate(row.auction_date),
      valueDate: formatDate(row.issue_date),
      amountOffered: formatAmount(row.amount_offered),
      bidsReceived: formatAmount(row.bids_received),
      performanceRate: perf,
      acceptedAmount: formatAmount(row.amount_accepted),
      averageYield: Number(row.accepted_average_rate ?? 0),
      previousYield: Number(row.previous_rate ?? row.accepted_average_rate ?? 0),
      minInvestment: "KSh 50,000",
    };
  });

  // 2. Fetch Bonds
  const { data: bondRows, error: bondError } = await supabase
    .from("treasury_bonds")
    .select("*, treasury_bond_auctions(*)")
    .order("maturity_date", { ascending: true });

  if (bondError) {
    console.error("Error fetching Treasury Bonds from Supabase:", bondError);
    throw bondError;
  }

  const bonds: TreasuryBond[] = (bondRows || []).map((row: any) => {
    const auctions = row.treasury_bond_auctions || [];
    const latestAuction = auctions.length > 0 ? auctions[0] : null;

    const statusVal: "OPEN" | "CLOSED" | "Active" | "Tax-Free" | "New Issue" =
      row.tax_status === "Tax-Exempt" ? "Tax-Free" : row.status === "OPEN" ? "OPEN" : "Active";

    return {
      id: row.id,
      issueNo: row.bond_code,
      isin: row.isin || "—",
      couponRate: Number(row.coupon_rate ?? 0),
      valueDate: formatDate(row.issue_date),
      maturityDate: formatDate(row.maturity_date),
      tenorYears: Number(row.original_tenor_years ?? 0),
      status: statusVal,
      name: `${row.bond_type === "Infrastructure" ? "Tax-Exempt Infrastructure" : "Fixed Rate"} Bond (${row.bond_code})`,
      amountIssued: formatAmount(latestAuction?.amount_accepted ?? latestAuction?.amount_offered),
      explanation:
        row.bond_type === "Infrastructure"
          ? "Infrastructure bonds (IFB) are 100% tax-free in Kenya under CBK regulations. Interest earned is exempt from withholding tax."
          : "Fixed-rate Treasury bonds provide regular semi-annual coupon interest payments backed by the Central Bank & National Treasury of Kenya.",
    };
  });

  // 3. Build Rate History from historical T-Bill rows
  const history1M: RateHistoryPoint[] = [];
  if (tbillRows && tbillRows.length > 0) {
    // Sort chronological
    const sorted = [...tbillRows].sort((a, b) => new Date(a.auction_date).getTime() - new Date(b.auction_date).getTime());
    const byDate: Record<string, RateHistoryPoint> = {};
    for (const r of sorted) {
      const dLabel = formatDate(r.auction_date);
      if (!byDate[dLabel]) {
        byDate[dLabel] = { date: dLabel };
      }
      if (r.tenor_days === 91) byDate[dLabel].rate91 = Number(r.accepted_average_rate);
      if (r.tenor_days === 182) byDate[dLabel].rate182 = Number(r.accepted_average_rate);
      if (r.tenor_days === 364) byDate[dLabel].rate364 = Number(r.accepted_average_rate);
    }
    history1M.push(...Object.values(byDate));
  }

  const rateHistory: RateHistoryMap = {
    "1M": history1M.length > 0 ? history1M : [
      { date: formatDate(latestByTenor[91]?.auction_date), rate91: Number(latestByTenor[91]?.accepted_average_rate ?? 0), rate182: Number(latestByTenor[182]?.accepted_average_rate ?? 0), rate364: Number(latestByTenor[364]?.accepted_average_rate ?? 0) }
    ],
  };

  return {
    bonds,
    tbills,
    rateHistory,
    lastVerifiedAt: tbillRows?.[0]?.retrieved_at ? formatDate(tbillRows[0].retrieved_at) : "August 2026",
  };
};

export const useTreasuryData = () => {
  return useQuery({
    queryKey: ["treasury-data"],
    queryFn: fetchTreasuryData,
    staleTime: 5 * 60 * 1000,
  });
};

