import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import InlineDataGate from "@/components/auth/InlineDataGate";
import { isBotOrPrerender } from "@/hooks/useSoftWallTrigger";
import { supabase } from "@/integrations/supabase/client";
import { formatMarketDate, formatMarketDateTime, toLastWeekday } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Search,
  Star,
  SlidersHorizontal,
  X,
  GitCompareArrows,
  Check,
  Coins,
  Fuel,
} from "lucide-react";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";
import SectionLiveStatus from "@/components/SectionLiveStatus";
import { CreateAlertDialog } from "@/components/alerts/PriceAlertComponents";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart } from "recharts";
import ActiveAlertsCard from "@/components/alerts/ActiveAlertsCard";
import RateFavourites from "../components/home/RateFavourites";
import { useAssetWatchlist } from "@/hooks/useAssetWatchlist";
import MarketPageLoader from "@/components/MarketPageLoader";
import { useMinimumLoadingDuration } from "@/hooks/useMinimumLoadingDuration";
import { getMarketPageMemory, setMarketPageMemory } from "@/lib/marketPageMemory";
import { getCurrencyFlagUrl, KENYA_FLAG_URL } from "@/lib/currencyBranding";
import { CommoditiesView } from "@/components/rates/CommoditiesView";
import { fetchPublicData } from "@/lib/gateway";
import FloatingPageCalculator from "@/components/calculator/FloatingPageCalculator";
import CurrencyConverter from "@/components/calculator/CurrencyConverter";
import CommodityCalculator from "@/components/calculator/CommodityCalculator";

interface Rate {
  id: string;
  currency_code: string;
  currency_name: string;
  rate: number;
  previous_rate: number | null;
  updated_at: string;
}

interface RateHistory {
  snapshot_date: string;
  rate: number;
}

interface RatesPageMemory {
  rates: Rate[];
  history: Record<string, RateHistory[]>;
}

const FALLBACK_RATES_DATA: Rate[] = [
  { id: "usd", currency_code: "USD", currency_name: "US Dollar", rate: 129.42, previous_rate: 129.25, updated_at: "2026-11-06T15:00:00Z" },
  { id: "eur", currency_code: "EUR", currency_name: "Euro", rate: 140.85, previous_rate: 140.60, updated_at: "2026-11-06T15:00:00Z" },
  { id: "gbp", currency_code: "GBP", currency_name: "British Pound", rate: 173.97, previous_rate: 174.15, updated_at: "2026-11-06T15:00:00Z" },
  { id: "ugx", currency_code: "UGX", currency_name: "Uganda Shilling", rate: 0.0350, previous_rate: 0.0350, updated_at: "2026-11-06T15:00:00Z" },
  { id: "tzs", currency_code: "TZS", currency_name: "Tanzania Shilling", rate: 0.0500, previous_rate: 0.0500, updated_at: "2026-11-06T15:00:00Z" },
  { id: "zar", currency_code: "ZAR", currency_name: "South Africa Rand", rate: 7.15, previous_rate: 7.10, updated_at: "2026-11-06T15:00:00Z" },
  { id: "aed", currency_code: "AED", currency_name: "UAE Dirham", rate: 35.24, previous_rate: 35.20, updated_at: "2026-11-06T15:00:00Z" },
  { id: "cad", currency_code: "CAD", currency_name: "Canadian Dollar", rate: 93.50, previous_rate: 93.40, updated_at: "2026-11-06T15:00:00Z" },
  { id: "cny", currency_code: "CNY", currency_name: "Chinese Yuan", rate: 17.85, previous_rate: 17.80, updated_at: "2026-11-06T15:00:00Z" },
  { id: "jpy", currency_code: "JPY", currency_name: "Japanese Yen", rate: 0.8500, previous_rate: 0.8490, updated_at: "2026-11-06T15:00:00Z" },
  { id: "chf", currency_code: "CHF", currency_name: "Swiss Franc", rate: 148.20, previous_rate: 148.10, updated_at: "2026-11-06T15:00:00Z" },
  { id: "inr", currency_code: "INR", currency_name: "Indian Rupee", rate: 1.51, previous_rate: 1.50, updated_at: "2026-11-06T15:00:00Z" },
  { id: "aud", currency_code: "AUD", currency_name: "Australian Dollar", rate: 82.30, previous_rate: 82.20, updated_at: "2026-11-06T15:00:00Z" },
  { id: "rwf", currency_code: "RWF", currency_name: "Rwandan Franc", rate: 0.092, previous_rate: 0.092, updated_at: "2026-11-06T15:00:00Z" },
];

const ChangeIndicator = ({ current, previous }: { current: number; previous: number | null }) => {
  if (previous == null) return <span className="text-muted-foreground text-sm">—</span>;
  const diff = current - previous;
  const pct = previous !== 0 ? ((diff / previous) * 100).toFixed(2) : "0.00";
  if (diff > 0)
    return (
      <span className="inline-flex items-center gap-1 text-emerald-500 dark:text-emerald-400 text-sm font-semibold">
        <TrendingUp className="h-3.5 w-3.5" /> +{pct}%
      </span>
    );
  if (diff < 0)
    return (
      <span className="inline-flex items-center gap-1 text-destructive text-sm font-semibold">
        <TrendingDown className="h-3.5 w-3.5" /> {pct}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
      <Minus className="h-3.5 w-3.5" /> 0.00%
    </span>
  );
};

const CurrencyPairAvatar = ({ currencyCode, compact = false }: { currencyCode: string; compact?: boolean }) => {
  const currencyFlagUrl = getCurrencyFlagUrl(currencyCode);
  const primarySize = compact ? "h-7 w-7" : "h-11 w-11";
  const kenyaSize = compact ? "h-4 w-4" : "h-7 w-7";

  return (
    <div
      className={`relative shrink-0 ${compact ? "h-8 w-9" : "h-12 w-14"}`}
      aria-label={`${currencyCode}/KES flags`}
    >
      {currencyFlagUrl ? (
        <img
          src={currencyFlagUrl}
          alt=""
          width={compact ? 28 : 44}
          height={compact ? 28 : 44}
          loading="lazy"
          decoding="async"
          className={`absolute left-0 top-0 ${primarySize} rounded-full border-2 border-card object-cover shadow-sm`}
        />
      ) : (
        <span className={`absolute left-0 top-0 flex ${primarySize} items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground`}>
          {currencyCode.slice(0, 2)}
        </span>
      )}
      <img
        src={KENYA_FLAG_URL}
        alt=""
        width={compact ? 16 : 28}
        height={compact ? 16 : 28}
        loading="lazy"
        decoding="async"
        className={`absolute bottom-0 right-0 ${kenyaSize} rounded-full border-2 border-card object-cover shadow-sm`}
      />
    </div>
  );
};

/* ─── Mini Sparkline (matches Stocks page) ─── */
const MiniSparkline = ({ data, positive, livePoint }: { data: RateHistory[]; positive: boolean; livePoint?: { snapshot_date: string, rate: number } }) => {
  const effectiveData = useMemo(() => {
    if (!data?.length) return [];
    const arr = [...data];
    if (livePoint && arr.length > 0 && arr[arr.length - 1].snapshot_date < livePoint.snapshot_date) {
      arr.push(livePoint);
    }
    return arr;
  }, [data, livePoint]);

  if (effectiveData.length < 2) return null;
  const color = positive ? "hsl(152 60% 42%)" : "hsl(var(--destructive))";
  const gradientId = `rate-sparkline-fill-${positive ? "up" : "down"}`;

  return (
    <div className="w-[60px] h-[24px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={effectiveData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={["dataMin - 0.01", "dataMax + 0.01"]} />
          <Area type="monotone" dataKey="rate" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line type="monotone" dataKey="rate" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export type MacroTab = "fx" | "commodities";

export interface RatesPageProps {
  initialTab?: MacroTab;
}

const RatesPage = ({ initialTab }: RatesPageProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tabParam = searchParams.get("tab");
  const itemParam = searchParams.get("item");

  const [activeTab, setActiveTab] = useState<MacroTab>(() => {
    if (initialTab) return initialTab;
    if (tabParam === "commodities" || tabParam === "commodity" || location.pathname === "/commodities") return "commodities";
    return "fx";
  });

  useEffect(() => {
    if (tabParam === "commodities" || tabParam === "commodity" || location.pathname === "/commodities") {
      setActiveTab("commodities");
    } else if (tabParam === "fx" || tabParam === "rates") {
      setActiveTab("fx");
    }
  }, [tabParam, location.pathname]);

  const isCommodityTab = activeTab === "commodities" || location.pathname.startsWith("/commodities");

  const handleTabChange = (val: MacroTab) => {
    setActiveTab(val);
    if (location.pathname === "/commodities" && val === "fx") {
      navigate("/rates", { replace: true });
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (val === "fx") {
          next.delete("tab");
        } else {
          next.set("tab", val);
        }
        return next;
      },
      { replace: true }
    );
  };

  useDocumentTitle(
    activeTab === "fx"
      ? "Kenya FX Exchange Rates – Live USD, EUR, GBP to KES Today"
      : "Kenya Commodity Prices – Gold, Oil & More Today",
    activeTab === "fx"
      ? "Live foreign exchange rates against the Kenya Shilling (KES). Track USD/KES, EUR/KES, GBP/KES and more. Updated daily from market data."
      : "Track gold, crude oil, and other commodity prices in Kenya. Indicative commodity pricing updated regularly for Kenyan investors and traders.",
    {
      title:
        activeTab === "fx"
          ? "Kenya FX Exchange Rates – Live USD, EUR, GBP to KES Today"
          : "Kenya Commodity Prices – Gold, Oil & More Today",
      description:
        activeTab === "fx"
          ? "Live KES exchange rates: USD, EUR, GBP, and more. Updated daily."
          : "Live commodity prices in Kenya: gold, crude oil, and more. Updated regularly.",
    }
  );

  useJsonLd(
    activeTab === "fx"
      ? {
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Kenya Foreign Exchange Rates – KES",
          description:
            "Live foreign exchange rates against the Kenyan Shilling (KES), including USD/KES, EUR/KES, GBP/KES and other major currency pairs. Updated daily.",
          url: "https://kenyafundfinder.com/rates",
          publisher: {
            "@type": "Organization",
            name: "Kenya Fund Finder",
            url: "https://kenyafundfinder.com",
          },
          spatialCoverage: { "@type": "Country", name: "Kenya", identifier: "KE" },
          temporalCoverage: "2024/..",
          variableMeasured: [
            { "@type": "PropertyValue", name: "USD/KES Rate", unitText: "Kenya Shilling per US Dollar" },
            { "@type": "PropertyValue", name: "EUR/KES Rate", unitText: "Kenya Shilling per Euro" },
            { "@type": "PropertyValue", name: "GBP/KES Rate", unitText: "Kenya Shilling per British Pound" },
          ],
          license: "https://kenyafundfinder.com/terms",
          isAccessibleForFree: true,
          keywords: "Kenya exchange rates, USD KES, EUR KES, GBP KES, Kenyan Shilling, forex Kenya",
        }
      : {
          "@context": "https://schema.org",
          "@type": "Dataset",
          name: "Kenya Commodity Prices",
          description:
            "Indicative commodity prices tracked for Kenyan investors, including gold, crude oil, and other key commodities. Updated regularly.",
          url: "https://kenyafundfinder.com/commodities",
          publisher: {
            "@type": "Organization",
            name: "Kenya Fund Finder",
            url: "https://kenyafundfinder.com",
          },
          spatialCoverage: { "@type": "Country", name: "Kenya", identifier: "KE" },
          temporalCoverage: "2024/..",
          variableMeasured: [
            { "@type": "PropertyValue", name: "Gold Price", unitText: "USD per troy ounce" },
            { "@type": "PropertyValue", name: "Crude Oil Price", unitText: "USD per barrel" },
            { "@type": "PropertyValue", name: "Commodity Price Index", unitText: "USD" },
          ],
          license: "https://kenyafundfinder.com/terms",
          isAccessibleForFree: true,
          keywords: "gold price Kenya, oil price Kenya, commodity prices Kenya, Kenyan commodities, commodity market Kenya",
        }
  );

  const { user, loading: authLoading } = useAuth();
  const isGated = !authLoading && !user && !isBotOrPrerender();
  const { entries: favEntries, isFavourite, toggle: toggleFavourite } = useAssetWatchlist("currency");
  const [initialPageMemory] = useState(() => getMarketPageMemory<RatesPageMemory>("rates"));

  const [rates, setRates] = useState<Rate[]>(() => initialPageMemory?.rates ?? FALLBACK_RATES_DATA);
  const [loading, setLoading] = useState(() => !initialPageMemory);
  const [initialHistoryReady, setInitialHistoryReady] = useState(() => Boolean(initialPageMemory));
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, RateHistory[]>>(initialPageMemory?.history ?? {});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        let fetchedRates: Rate[] = [];

        // 1. Primary: Edge function gateway
        try {
          const res = await fetchPublicData<any>("rates", { limit: 200 });
          if (Array.isArray(res?.data) && res.data.length > 0) {
            fetchedRates = res.data.map((r: any) => ({
              id: r.id || r.currency_code,
              currency_code: r.currency_code,
              currency_name: r.currency_name,
              rate: Number(r.rate) || 0,
              previous_rate: r.previous_rate != null ? Number(r.previous_rate) : null,
              updated_at: r.updated_at || new Date().toISOString(),
            }));
          }
        } catch (gwErr) {
          console.warn("fetchPublicData gateway failed for rates, trying direct supabase:", gwErr);
        }

        // 2. Direct Supabase table fallback
        if (fetchedRates.length === 0) {
          try {
            const { data, error } = await supabase
              .from("exchange_rates_public" as any)
              .select("id, currency_code, currency_name, rate, previous_rate, updated_at")
              .order("sort_order");
            if (!error && Array.isArray(data) && data.length > 0) {
              fetchedRates = data.map((r: any) => ({
                ...r,
                rate: Number(r.rate) || 0,
                previous_rate: r.previous_rate != null ? Number(r.previous_rate) : null,
              }));
            }
          } catch (dbErr) {
            console.warn("Direct exchange_rates_public query failed:", dbErr);
          }
        }

        if (fetchedRates.length > 0) {
          setRates(fetchedRates);
        }
      } catch (error) {
        console.error("Failed to load FX rates", error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const ch = supabase
      .channel("rates-page-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "exchange_rates" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Preload sparkline history for all rates (last ~90 days, refreshed periodically)
  useEffect(() => {
    if (loading) return;
    if (rates.length === 0) {
      setInitialHistoryReady(true);
      return;
    }
    let cancelled = false;
    const fetchAllHistory = async () => {
      try {
        // Pull the most recent ~90 days across all currencies. Order DESC so the
        // 1000-row Supabase default cap drops the OLDEST rows, not the newest.
        const sinceIso = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const { data } = await supabase
          .from("exchange_rate_history_public" as any)
          .select("exchange_rate_id, rate, snapshot_date")
          .gte("snapshot_date", sinceIso)
          .order("snapshot_date", { ascending: false })
          .limit(2000);
        if (cancelled || !data) return;
        const grouped: Record<string, RateHistory[]> = {};
        (data as any[]).forEach((d) => {
          const rid = d.exchange_rate_id;
          if (!grouped[rid]) grouped[rid] = [];
          grouped[rid].push({ snapshot_date: d.snapshot_date, rate: Number(d.rate) });
        });
        // Sort ascending for chart rendering
        Object.keys(grouped).forEach((k) => {
          grouped[k].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
        });
        setHistory(grouped);
      } catch (error) {
        console.error("Failed to load FX rate sparkline data", error);
      } finally {
        if (!cancelled) setInitialHistoryReady(true);
      }
    };
    fetchAllHistory();
    // Refresh every 5 minutes so newly-snapshotted points appear without reload
    const intervalId = window.setInterval(() => void fetchAllHistory(), 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [rates, loading]);

  const toggleExpand = async (rateId: string) => {
    if (expanded === rateId) {
      setExpanded(null);
      return;
    }
    setExpanded(rateId);
    if (!history[rateId]) {
      setHistoryLoading(rateId);
      const { data } = await supabase
        .from("exchange_rate_history_public" as any)
        .select("id, exchange_rate_id, rate, snapshot_date")
        .eq("exchange_rate_id", rateId)
        .order("snapshot_date", { ascending: false })
        .limit(90);
      const points = ((data as any) || [])
        .map((d: any) => ({ snapshot_date: d.snapshot_date, rate: Number(d.rate) }))
        .sort((a: RateHistory, b: RateHistory) => a.snapshot_date.localeCompare(b.snapshot_date));
      setHistory((prev) => ({ ...prev, [rateId]: points }));
      setHistoryLoading(null);
    }
  };

  const latestUpdate = useMemo(() => {
    if (!rates.length) return null;
    const validDates = rates
      .map((r) => r.updated_at)
      .filter((d): d is string => Boolean(d && typeof d === "string"));
    if (!validDates.length) return null;
    const maxDate = validDates.reduce((l, d) => (d > l ? d : l), validDates[0]);
    try {
      return toLastWeekday(maxDate);
    } catch {
      return null;
    }
  }, [rates]);

  const strengthened = useMemo(() => rates.filter((r) => r.previous_rate != null && r.rate < r.previous_rate).length, [rates]);
  const weakened = useMemo(() => rates.filter((r) => r.previous_rate != null && r.rate > r.previous_rate).length, [rates]);
  const unchanged = useMemo(() => rates.filter((r) => r.previous_rate == null || r.rate === r.previous_rate).length, [rates]);

  const [mobileMovement, setMobileMovement] = useState<"all" | "gainers" | "losers" | "unchanged">("all");
  type SortKey = "default" | "rate_desc" | "rate_asc" | "change_desc" | "change_asc" | "name_asc" | "name_desc";
  const [mobileSort, setMobileSort] = useState<SortKey>("default");
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const RATE_SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: "default", label: "Default order" },
    { key: "rate_desc", label: "Rate: High → Low" },
    { key: "rate_asc", label: "Rate: Low → High" },
    { key: "change_desc", label: "Change %: High → Low" },
    { key: "change_asc", label: "Change %: Low → High" },
    { key: "name_asc", label: "Currency: A → Z" },
    { key: "name_desc", label: "Currency: Z → A" },
  ];
  const currentSortLabel = RATE_SORT_OPTIONS.find((o) => o.key === mobileSort)?.label || "All";

  const isRatesGated = isGated && rates.length > 3;
  const teaserRates = useMemo(() => (isRatesGated ? rates.slice(3, 5) : []), [isRatesGated, rates]);

  const filtered = useMemo(() => {
    let result = isRatesGated ? rates.slice(0, 3) : rates;
    if (mobileMovement === "gainers") result = result.filter((r) => r.previous_rate != null && r.rate < r.previous_rate);
    else if (mobileMovement === "losers") result = result.filter((r) => r.previous_rate != null && r.rate > r.previous_rate);
    else if (mobileMovement === "unchanged") result = result.filter((r) => r.previous_rate == null || r.rate === r.previous_rate);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(r => r.currency_code.toLowerCase().includes(q) || r.currency_name.toLowerCase().includes(q));
    }
    if (mobileSort !== "default") {
      const pct = (r: Rate) => (r.previous_rate != null && r.previous_rate !== 0 ? ((r.rate - r.previous_rate) / r.previous_rate) * 100 : 0);
      const arr = [...result];
      switch (mobileSort) {
        case "rate_desc": arr.sort((a, b) => b.rate - a.rate); break;
        case "rate_asc": arr.sort((a, b) => a.rate - b.rate); break;
        case "change_desc": arr.sort((a, b) => pct(b) - pct(a)); break;
        case "change_asc": arr.sort((a, b) => pct(a) - pct(b)); break;
        case "name_asc": arr.sort((a, b) => a.currency_code.localeCompare(b.currency_code)); break;
        case "name_desc": arr.sort((a, b) => b.currency_code.localeCompare(a.currency_code)); break;
      }
      result = arr;
    }
    return result;
  }, [rates, isRatesGated, search, mobileMovement, mobileSort]);

  const displayRates = isRatesGated ? filtered.slice(0, 3) : filtered;

  const pageLoading = loading && rates.length === 0;
  const showPageLoading = useMinimumLoadingDuration(pageLoading);

  useEffect(() => {
    if (!pageLoading) {
      setMarketPageMemory<RatesPageMemory>("rates", { rates, history });
    }
  }, [history, pageLoading, rates]);

  // Deep-link auto-scroll and highlight logic
  useEffect(() => {
    if (!itemParam || loading || activeTab !== "fx") return;
    const cleanTarget = itemParam.toLowerCase().trim();

    const timer = setTimeout(() => {
      const selector = `[data-asset-id="${cleanTarget}"], #rate-row-${cleanTarget}, #rate-card-${cleanTarget}`;
      const targetEl = document.querySelector(selector);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        setActiveHighlight(cleanTarget);
        const clearTimer = setTimeout(() => setActiveHighlight(null), 3000);
        return () => clearTimeout(clearTimer);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [itemParam, loading, displayRates, activeTab]);

  if (showPageLoading && activeTab === "fx") {
    return (
      <div className="min-h-screen px-4 md:px-6 py-5 md:py-6">
        <MarketPageLoader message="Loading latest FX rate data…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen animate-in fade-in-50 duration-500">
      <div className="px-4 md:px-6 py-5 md:py-6">
        {/* Top Header */}
        <div className="mb-3.5">
          <div className="hidden md:flex items-end justify-between gap-6 mb-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-500">
                Macroeconomic Intelligence
              </p>
              <h1 className="mt-2 text-4xl lg:text-5xl font-black tracking-tight">
                {activeTab === "fx" ? "Foreign Exchange (FX)" : "Commodities & Energy"}
              </h1>
              <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {activeTab === "fx"
                  ? "Live Central Bank of Kenya exchange rates against the Kenyan Shilling (KES) and commercial bank benchmarks."
                  : "Live global benchmarks, local agricultural auctions (tea & coffee), and EPRA pump prices."}
              </p>
            </div>
            {activeTab === "fx" && (
              <SectionLiveStatus section="rates" fallbackDate={latestUpdate} isLoading={loading} />
            )}
          </div>
          <div className="md:hidden">
            <h1 className="sr-only">{activeTab === "fx" ? "FX Rates" : "Commodity Prices"}</h1>
            <p className="text-sm text-muted-foreground mt-0">
              {activeTab === "fx"
                ? "Live exchange rates against the Kenyan Shilling (KES)."
                : "Live gold, crude oil, EPRA fuel, and agricultural commodity prices."}
            </p>
          </div>
        </div>

        {/* Tab Switcher Pills */}
        <div className="mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => handleTabChange("fx")}
            className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "fx"
                ? "border-foreground bg-foreground text-background shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>Foreign Exchange (FX)</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-normal tabular-nums ${
                activeTab === "fx"
                  ? "bg-background/20 text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {rates.length > 0 ? rates.length : "18+"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("commodities")}
            className={`shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "commodities"
                ? "border-foreground bg-foreground text-background shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            }`}
          >
            <Fuel className="h-4 w-4" />
            <span>Commodities & Energy</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-normal tabular-nums ${
                activeTab === "commodities"
                  ? "bg-background/20 text-background"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              Markets
            </span>
          </button>
        </div>

        {activeTab === "commodities" ? (
          <CommoditiesView highlightItem={itemParam} />
        ) : (
          <>
            <ActiveAlertsCard assetType="currency" />

            {user && favEntries.length > 0 && <RateFavourites entries={favEntries} rates={rates} />}

        {/* Desktop Premium Toolbar */}
        <div className="hidden md:flex items-center justify-between gap-4 mb-5 mt-7">
          <div className="flex items-center gap-3 pl-1">
            <div className="inline-flex items-center gap-1">
              {([
                { key: "all", label: "All", count: rates.length },
                { key: "gainers", label: "Gainers", count: strengthened },
                { key: "losers", label: "Losers", count: weakened },
                { key: "unchanged", label: "Unchanged", count: unchanged },
              ] as const).map((opt) => {
                const active = mobileMovement === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setMobileMovement(opt.key)}
                    className={`inline-flex h-11 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition-colors whitespace-nowrap ${
                      active ? "border-foreground bg-foreground text-background" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                    {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                    {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5" />}
                    {opt.label}
                    <span className={`font-normal tabular-nums ${active ? "text-background/70" : "text-muted-foreground"}`}>{opt.count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3 pr-1">
            <div className="relative w-80 shrink-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search currencies"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 rounded-full border-border bg-card pl-11 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-1"
              />
            </div>
          </div>
        </div>



        {/* Desktop Table */}
        <div className="hidden md:block">
          {loading ? (
            <TableSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState label="exchange rates" />
          ) : (
            <div className="rounded-[22px] border border-border overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
              <table className="w-full text-sm table-fixed min-w-[900px] lg:min-w-0">
                <colgroup>
                  <col style={{ width: "3%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "12%" }} />
                  {user && <col style={{ width: "3%" }} />}
                  <col style={{ width: "4%" }} />
                </colgroup>
                <thead>
                  <tr className="bg-background text-[12px] text-muted-foreground border-b border-border/40">
                    <th className="text-left pl-4 pr-2 py-3 font-normal">#</th>
                    <th className="text-left px-3 py-3 font-normal">Pair</th>
                    <th className="text-left px-3 py-3 font-normal">Currency</th>
                    <th className="text-left px-3 py-3 font-normal">Rate (KES)</th>
                    <th className="text-left px-3 py-3 font-normal">Previous</th>
                    <th className="text-left px-3 py-3 font-normal">Change</th>
                    <th className="text-left px-3 py-3 font-normal">Change %</th>
                    <th className="text-left px-3 py-3 font-normal">Trend</th>
                    <th className="text-left px-3 py-3 font-normal">Updated</th>
                    {user && <th className="w-8"></th>}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayRates.map((r, i) => {
                    const isRowHighlighted =
                      Boolean(activeHighlight) &&
                      (r.currency_code.toLowerCase() === activeHighlight ||
                        r.id.toLowerCase() === activeHighlight ||
                        activeHighlight.includes(r.currency_code.toLowerCase()));
                    return (
                      <RateRow
                        key={r.id}
                        rate={r}
                        index={i}
                        isExpanded={expanded === r.id}
                        isHighlighted={isRowHighlighted}
                        onToggle={() => toggleExpand(r.id)}
                        history={history[r.id]}
                        historyLoading={historyLoading === r.id}
                        isFavourite={user ? isFavourite(r.id) : undefined}
                        onToggleFavourite={user ? () => toggleFavourite(r.id, `${r.currency_code} - ${r.currency_name}`) : undefined}
                      />
                    );
                  })}
                  {isRatesGated && teaserRates.map((r, idx) => (
                    <tr
                      key={`rate-teaser-${r.id || idx}`}
                      aria-hidden="true"
                      className="pointer-events-none select-none blur-[2px] opacity-40 bg-card border-b border-border/40"
                    >
                      <td className="px-3 py-3 font-semibold text-foreground">{r.currency_code}</td>
                      <td className="px-3 py-3 text-muted-foreground">{r.currency_name}</td>
                      <td className="px-3 py-3 font-semibold">KSh •••.••</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-muted-foreground">Today</td>
                      {user && <td />}
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {isRatesGated && (
            <div className="hidden md:block mt-4 mb-8">
              <InlineDataGate
                category="rates"
                totalCount={rates.length}
                visibleCount={3}
                title="Unlock All 18+ Live FX Exchange Rates"
                description="Showing top 3 currency pairs. Create a free account to track all African, Asian, and major global currencies against the Kenya Shilling (KES) with 90-day historical trends."
              />
            </div>
          )}
        </div>

        {/* Mobile: Filter Pills Row */}
        <div className="md:hidden mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* 1. All / Sort Pill (triggers Bottom Sheet) */}
          <button
            type="button"
            onClick={() => setSortSheetOpen(true)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              mobileSort !== "default"
                ? "bg-emerald-600 text-white shadow-sm"
                : mobileMovement === "all"
                  ? "bg-foreground text-background shadow-sm"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground"
            }`}
          >
            <span>{mobileSort !== "default" ? currentSortLabel : "All"}</span>
            <ChevronDown className={`h-3.5 w-3.5 ${mobileSort !== "default" || mobileMovement === "all" ? "opacity-90" : "opacity-60"}`} />
            <span className={`text-[11px] tabular-nums font-normal ${mobileSort !== "default" || mobileMovement === "all" ? "text-inherit opacity-90" : "text-muted-foreground/80"}`}>
              {rates.length}
            </span>
          </button>

          {/* 2. Movement Quick Filters: Gainers, Losers, Unchanged */}
          {([
            { key: "gainers", label: "Gainers", count: strengthened },
            { key: "losers", label: "Losers", count: weakened },
            { key: "unchanged", label: "Unchanged", count: unchanged },
          ] as const).map((opt) => {
            const active = mobileMovement === opt.key && mobileSort === "default";
            return (
              <button
                key={opt.key}
                type="button"
                onClick={(e) => {
                  setMobileSort("default");
                  setMobileMovement(opt.key);
                  e.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "center",
                    block: "nearest",
                  });
                }}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "border border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                {opt.key === "gainers" && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                {opt.key === "losers" && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                {opt.key === "unchanged" && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                <span>{opt.label}</span>
                <span className={`text-[11px] tabular-nums font-normal ${active ? "text-background/80" : "text-muted-foreground/80"}`}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile: Sort & Filter Bottom Sheet */}
        <Sheet open={sortSheetOpen} onOpenChange={setSortSheetOpen}>
          <SheetContent side="bottom" hideCloseButton className="rounded-t-3xl border-border max-h-[80vh] overflow-y-auto px-5 pt-4 pb-8">
            <SheetHeader className="text-left pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <SheetTitle className="text-base font-bold text-foreground">Sort & Filter</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Customize currency sorting and order</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSortSheetOpen(false)}
                  className="h-8 w-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-1.5">
                {RATE_SORT_OPTIONS.map((opt) => {
                  const active = mobileSort === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setMobileSort(opt.key);
                        setSortSheetOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all ${
                        active
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-muted/40 hover:bg-muted text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${active ? "bg-white" : "bg-emerald-500"}`} />
                        <span>{opt.label}</span>
                      </div>
                      {active && (
                        <span className="text-xs font-medium bg-white/20 text-white px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {mobileSort !== "default" && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSort("default");
                    setSortSheetOpen(false);
                  }}
                  className="w-full h-10 rounded-full border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset to Default
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Mobile Live Status (Between filter pills and first card) */}
        <div className="md:hidden mb-3.5 flex items-center justify-between px-0.5">
          <SectionLiveStatus section="rates" fallbackDate={latestUpdate} isLoading={loading} className="w-full justify-between" />
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-2.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-3.5">
                <Skeleton className="h-5 w-20 mb-2" />
                <Skeleton className="h-4 w-40 mb-3" />
                <Skeleton className="h-12 rounded-lg" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <EmptyState label="exchange rates" />
          ) : (
            <>
              {displayRates.map((r) => {
                const positive = r.previous_rate != null ? r.rate >= r.previous_rate : true;
                const isCardHighlighted =
                  Boolean(activeHighlight) &&
                  (r.currency_code.toLowerCase() === activeHighlight ||
                    r.id.toLowerCase() === activeHighlight ||
                    activeHighlight.includes(r.currency_code.toLowerCase()));
                return (
                  <MobileRateCard
                    key={r.id}
                    rate={r}
                    history={history[r.id]}
                    historyLoading={historyLoading === r.id}
                    positive={positive}
                    isExpanded={expanded === r.id}
                    isHighlighted={isCardHighlighted}
                    onToggle={() => toggleExpand(r.id)}
                    isFavourite={user ? isFavourite(r.id) : undefined}
                    onToggleFavourite={user ? () => toggleFavourite(r.id, `${r.currency_code} - ${r.currency_name}`) : undefined}
                  />
                );
              })}
              {isRatesGated && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none select-none blur-[2px] opacity-40 rounded-xl border border-border bg-card p-4 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-5 w-16 bg-muted rounded" />
                  </div>
                  <div className="h-3 w-40 bg-muted rounded" />
                </div>
              )}
              {isRatesGated && (
                <InlineDataGate
                  category="rates"
                  totalCount={rates.length}
                  visibleCount={3}
                  title="Unlock All 18+ Live FX Exchange Rates"
                  description="Showing top 3 currency pairs. Create a free account to track all African, Asian, and major global currencies against the Kenya Shilling (KES) with 90-day historical trends."
                />
              )}
            </>
          )}
        </div>

        {/* Summary footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-4 px-1">
          <span>
            {isRatesGated
              ? `Showing ${displayRates.length} of ${rates.length} currencies (preview)`
              : `Showing ${filtered.length} of ${rates.length} currencies`}
          </span>
        </div>

        <div className="mt-4 rounded-lg bg-muted/40 border border-border/50 p-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            Exchange rates shown are indicative and sourced from the Central Bank of Kenya and international markets.
            Click on any currency to view historical rate trends. This information is for educational purposes only.
          </p>
        </div>
          </>
        )}
      </div>

      {/* Floating Page Calculator: Dynamically toggled between Commodities and FX */}
      {isCommodityTab ? (
        <FloatingPageCalculator
          buttonLabel="Commodity Calculator"
          title="Commodities Calculator"
          description="Convert units to USD and KES, estimate purchase costs and investment returns"
        >
          <CommodityCalculator />
        </FloatingPageCalculator>
      ) : (
        <FloatingPageCalculator
          buttonLabel="FX Converter"
          title="FX & Currency Calculator"
          description="Convert Kenyan Shilling (KES) against USD, EUR, GBP, and global currencies"
        >
          <CurrencyConverter />
        </FloatingPageCalculator>
      )}
    </div>
  );
};

/* ─── Mobile Card (matches Stocks page layout) ─── */
const MobileRateCard = ({
  rate: r,
  history,
  historyLoading,
  positive,
  isExpanded,
  isHighlighted,
  onToggle,
  isFavourite,
  onToggleFavourite,
}: {
  rate: Rate;
  history?: RateHistory[];
  historyLoading?: boolean;
  positive: boolean;
  isExpanded?: boolean;
  isHighlighted?: boolean;
  onToggle?: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
}) => {
  const { add, remove, isSelected } = useUniversalCompare();
  const isCompared = isSelected(r.id);

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCompared) {
      remove(r.id);
    } else {
      add({
        id: r.id,
        category: "currency",
        title: r.currency_name,
        subtitle: `${r.currency_code}/KES`,
        data: r,
      });
    }
  };

  const change = r.previous_rate != null ? r.rate - r.previous_rate : null;
  const changePct = r.previous_rate != null && r.previous_rate !== 0 ? ((change! / r.previous_rate) * 100) : null;

  return (
    <div
      data-asset-id={r.currency_code.toLowerCase()}
      id={`rate-card-${r.currency_code.toLowerCase()}`}
      className={`block rounded-[22px] border bg-slate-50/80 dark:bg-card p-4 shadow-sm transition-all overflow-hidden mb-3 ${
        isHighlighted
          ? "ring-2 ring-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 transition-all duration-500 animate-pulse"
          : isCompared
          ? "border-emerald-500 ring-2 ring-emerald-500/20 dark:border-emerald-400 bg-emerald-500/[0.04]"
          : "border-border/80 hover:border-emerald-500/30"
      }`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left"
        aria-expanded={isExpanded}
      >
        {/* Top Row: currency-pair image, rate details, sparkline, and rate. */}
        <div className="flex items-center gap-3">
          <CurrencyPairAvatar currencyCode={r.currency_code} />

          <div className="min-w-0 flex-1">
            <span className="font-extrabold text-foreground text-[17px] tracking-tight">{r.currency_code}/KES</span>
            <p className="text-sm text-muted-foreground truncate mt-0.5">{r.currency_name}</p>
          </div>

          <div className="shrink-0 px-1">
            <MiniSparkline data={history || []} positive={positive} livePoint={{ snapshot_date: new Date().toISOString().split("T")[0], rate: r.rate }} />
          </div>

          <div className="text-right shrink-0">
            <p className="font-extrabold text-foreground text-[17px] tabular-nums">
              KES {r.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="mt-0.5 flex justify-end">
              <ChangeIndicator current={r.rate} previous={r.previous_rate} />
            </div>
          </div>
        </div>

        {/* Thin Divider Line */}
        <div className="border-t border-border/40 my-3" />

        {/* Bottom Row: Prev Rate (Left) and Compare / Watchlist / Expand Chevron (Right) */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              Prev <strong className="font-semibold text-foreground ml-0.5">{r.previous_rate != null ? `KES ${r.previous_rate.toFixed(2)}` : "—"}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleCompare}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                isCompared
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "border border-border/80 bg-muted/40 text-foreground hover:bg-muted"
              }`}
              aria-label={isCompared ? `Remove ${r.currency_code} from compare` : `Compare ${r.currency_code}`}
            >
              {isCompared ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <GitCompareArrows className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{isCompared ? "Added" : "Compare"}</span>
            </button>

            {onToggleFavourite !== undefined && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavourite();
                }}
                className="p-1"
                aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
              >
                <Star
                  className={`h-4 w-4 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30 hover:text-yellow-500"}`}
                />
              </span>
            )}

            <span className="text-muted-foreground p-1">
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-muted/20 p-3 space-y-3">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-2">
            <DetailBox label="Current Rate" value={`KES ${r.rate.toFixed(2)}`} />
            <DetailBox
              label="Previous Rate"
              value={r.previous_rate != null ? `KES ${r.previous_rate.toFixed(2)}` : "—"}
            />
            <DetailBox
              label="Change (Abs)"
              value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(4)}` : "—"}
              color={change != null ? (change > 0 ? "text-destructive" : change < 0 ? "text-accent" : undefined) : undefined}
            />
            <DetailBox
              label="Change (%)"
              value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"}
              color={changePct != null ? (changePct > 0 ? "text-destructive" : changePct < 0 ? "text-accent" : undefined) : undefined}
            />
          </div>

          {/* History chart */}
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-foreground">Rate History (Last 90 Days)</span>
            </div>
            {historyLoading ? (
              <div className="h-[180px] flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg" />
              </div>
            ) : !history || history.length === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">
                No historical data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                {(() => {
                  const todayIso = new Date().toISOString().split("T")[0];
                  const effectiveHistory = [...history];
                  if (effectiveHistory.length > 0 && effectiveHistory[effectiveHistory.length - 1].snapshot_date < todayIso) {
                    effectiveHistory.push({ snapshot_date: todayIso, rate: r.rate });
                  }
                  return (
                    <LineChart data={effectiveHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="snapshot_date"
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => formatMarketDate(v, "en-KE", { month: "short", day: "numeric" })}
                    minTickGap={20}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                    width={45}
                    tickFormatter={(v) => v.toFixed(2)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    itemStyle={{ color: "#10b981" }}
                    labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                    formatter={(value: number) => [`KES ${value.toFixed(4)}`, "Rate"]}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ fill: "#10b981", stroke: "#10b981" }} />
                </LineChart>
                  );
                })()}
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              Updated: {formatMarketDateTime(r.updated_at)}
            </p>
            <CreateAlertDialog
              assetType="currency"
              assetId={r.id}
              assetName={`${r.currency_code}/KES`}
              currentPrice={r.rate}
              unit="KES"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const RateRow = ({
  rate, index, isExpanded, isHighlighted, onToggle, history, historyLoading, isFavourite, onToggleFavourite,
}: {
  rate: Rate; index: number; isExpanded: boolean; isHighlighted?: boolean; onToggle: () => void;
  history?: RateHistory[]; historyLoading: boolean;
  isFavourite?: boolean; onToggleFavourite?: () => void;
}) => {
  const change = rate.previous_rate != null ? rate.rate - rate.previous_rate : null;
  const changePct = rate.previous_rate != null && rate.previous_rate !== 0
    ? ((change! / rate.previous_rate) * 100)
    : null;

  const positive = rate.previous_rate != null ? rate.rate >= rate.previous_rate : true;
  const direction =
    change == null || change === 0
      ? { label: "Flat", className: "text-muted-foreground bg-muted/40" }
      : change > 0
      ? { label: "Up", className: "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10" }
      : { label: "Down", className: "text-destructive bg-destructive/10" };
  const updatedShort = formatMarketDate(rate.updated_at);

  return (
    <>
      <tr
        data-asset-id={rate.currency_code.toLowerCase()}
        id={`rate-row-${rate.currency_code.toLowerCase()}`}
        className={`border-b border-border/40 hover:bg-accent/5 transition-colors cursor-pointer group ${
          isHighlighted
            ? "ring-2 ring-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 duration-500 animate-pulse"
            : isExpanded
            ? "bg-muted/30"
            : ""
        }`}
        onClick={onToggle}
      >
        <td className="pl-4 pr-2 py-4 text-muted-foreground/60 text-sm tabular-nums">{index + 1}</td>
        <td className="px-3 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <CurrencyPairAvatar currencyCode={rate.currency_code} compact />
            <span className="font-bold text-foreground text-sm tracking-wide whitespace-nowrap">{rate.currency_code}/KES</span>
          </div>
        </td>
        <td className="px-3 py-4">
          <span className="block text-sm text-foreground truncate" title={rate.currency_name}>{rate.currency_name}</span>
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap">
          <span className="font-bold text-foreground text-sm">
            {rate.rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap text-sm text-muted-foreground">
          {rate.previous_rate != null
            ? rate.previous_rate.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
            : "—"}
        </td>
        <td className="px-3 py-4 tabular-nums whitespace-nowrap text-sm">
          {change == null ? (
            <span className="text-muted-foreground">—</span>
          ) : change > 0 ? (
            <span className="text-emerald-500 dark:text-emerald-400 font-semibold">+{change.toFixed(4)}</span>
          ) : change < 0 ? (
            <span className="text-destructive font-semibold">{change.toFixed(4)}</span>
          ) : (
            <span className="text-muted-foreground">0.0000</span>
          )}
        </td>
        <td className="px-3 py-4">
          <ChangeIndicator current={rate.rate} previous={rate.previous_rate} />
        </td>
        <td className="px-3 py-4">
          {history && history.length >= 2 ? (
            <MiniSparkline data={history} positive={positive} livePoint={{ snapshot_date: new Date().toISOString().split("T")[0], rate: rate.rate }} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-3 py-4 text-sm text-muted-foreground whitespace-nowrap">{updatedShort}</td>
        {onToggleFavourite !== undefined && (
          <td className="px-2 py-4 text-center">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavourite(); }}
              className="p-1 rounded-md hover:bg-muted transition-colors"
              aria-label={isFavourite ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Star className={`h-4 w-4 transition-colors ${isFavourite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/40 hover:text-yellow-500"}`} />
            </button>
          </td>
        )}
        <td className="px-2 py-4 text-center">
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-border bg-muted/20">
          <td colSpan={onToggleFavourite !== undefined ? 11 : 10} className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <DetailBox label="Current Rate" value={`KES ${rate.rate.toFixed(2)}`} />
              <DetailBox label="Previous Rate" value={rate.previous_rate != null ? `KES ${rate.previous_rate.toFixed(2)}` : "—"} />
              <DetailBox label="Change (Abs)" value={change != null ? `${change > 0 ? "+" : ""}${change.toFixed(4)}` : "—"} color={change != null ? (change > 0 ? "text-destructive" : change < 0 ? "text-emerald-500 dark:text-emerald-400" : undefined) : undefined} />
              <DetailBox label="Change (%)" value={changePct != null ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(2)}%` : "—"} color={changePct != null ? (changePct > 0 ? "text-destructive" : changePct < 0 ? "text-emerald-500 dark:text-emerald-400" : undefined) : undefined} />
            </div>

            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground">Rate History (Last 90 Days)</span>
              </div>
              {historyLoading ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-lg" />
                </div>
              ) : !history || history.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  No historical data available yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  {(() => {
                    const todayIso = new Date().toISOString().split("T")[0];
                    const effectiveHistory = [...history];
                    if (effectiveHistory.length > 0 && effectiveHistory[effectiveHistory.length - 1].snapshot_date < todayIso) {
                      effectiveHistory.push({ snapshot_date: todayIso, rate: rate.rate });
                    }
                    return (
                      <LineChart data={effectiveHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="snapshot_date"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickFormatter={(v) => formatMarketDate(v, "en-KE", { month: "short", day: "numeric" })}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      width={55}
                      tickFormatter={(v) => v.toFixed(2)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      itemStyle={{ color: "#10b981" }}
                      labelFormatter={(v) => formatMarketDate(v, "en-KE", { month: "long", day: "numeric", year: "numeric" })}
                      formatter={(value: number) => [`KES ${value.toFixed(4)}`, "Rate"]}
                    />
                      <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ fill: "#10b981", stroke: "#10b981" }} />
                    </LineChart>
                    );
                  })()}
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                Last updated: {formatMarketDateTime(rate.updated_at)}
              </p>
              <CreateAlertDialog
                assetType="currency"
                assetId={rate.id}
                assetName={`${rate.currency_code}/KES`}
                currentPrice={rate.rate}
                unit="KES"
              />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const StatCard = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className={`text-xl font-bold tabular-nums ${color || "text-foreground"}`}>{value}</p>
  </div>
);

const DetailBox = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="bg-muted/40 rounded-lg px-3 py-2">
    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
    <p className={`font-semibold text-sm tabular-nums ${color || "text-foreground"}`}>{value}</p>
  </div>
);

const TableSkeleton = () => (
  <div className="rounded-xl border border-border overflow-hidden bg-card">
    <div className="bg-muted/60 px-4 py-3">
      <div className="flex gap-4">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-t border-border">
        <Skeleton className="h-4 w-5" />
        <div className="flex-1">
          <Skeleton className="h-4 w-40 mb-1.5" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-14" />
      </div>
    ))}
  </div>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-xl border border-border bg-card text-center py-14">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl">📊</span>
      </div>
      <p className="text-sm text-muted-foreground font-medium">No {label} available</p>
    </div>
  </div>
);

export default RatesPage;
