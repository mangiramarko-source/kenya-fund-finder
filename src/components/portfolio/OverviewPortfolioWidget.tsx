import { Link, useNavigate } from "react-router-dom";
import { usePortfolio, PortfolioItem } from "@/hooks/usePortfolio";
import { usePortfolioChanges } from "@/hooks/usePortfolioChanges";
import PortfolioHoldingCard from "@/components/portfolio/PortfolioHoldingCard";
import { ArrowRight, Briefcase, Plus } from "lucide-react";

const DEMO_ITEM: PortfolioItem = {
  id: "demo-safaricom",
  user_id: "demo",
  asset_type: "stock",
  asset_name: "Safaricom PLC",
  ticker: "SCOM",
  asset_id: null,
  units: 1000,
  buy_price: 14.55,
  current_price: 15.25,
  current_yield: 0,
  buy_date: new Date().toISOString(),
  notes: "Sample holding",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const DEMO_CHANGE = {
  itemId: "demo-safaricom",
  assetType: "stock",
  assetName: "Safaricom PLC",
  current: 15.25,
  previous: 15.07,
  delta: 0.18,
  deltaPct: 1.2,
  unit: "KES" as const,
};

export default function OverviewPortfolioWidget() {
  const { items, totalValue } = usePortfolio();
  const { changes } = usePortfolioChanges(items);
  const navigate = useNavigate();

  const isDemoFallback = items.length === 0;
  const displayItems = isDemoFallback ? [DEMO_ITEM] : items.slice(0, 5);
  const hasMore = items.length > 5;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-[#00A651]" />
          Portfolio
          {isDemoFallback && (
            <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold px-1.5 py-0.5 rounded-md">
              SAMPLE
            </span>
          )}
        </h2>
        <Link
          to="/portfolio"
          className="text-xs font-bold text-[#00A651] hover:underline flex items-center gap-0.5"
        >
          {isDemoFallback ? "Create Portfolio" : "Manage"}
        </Link>
      </div>

      <div className="flex overflow-x-auto gap-3.5 pb-2.5 -mx-4 px-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent md:mx-0 md:px-0">
        {displayItems.map((item) => {
          const itemChange = isDemoFallback
            ? DEMO_CHANGE
            : changes.find((c) => c.itemId === item.id);
          return (
            <PortfolioHoldingCard
              key={item.id}
              item={item}
              currency="KES"
              totalValue={isDemoFallback ? 15250 : totalValue}
              change={itemChange}
              compact={true}
              onClick={() => navigate("/portfolio")}
              className="w-[270px] sm:w-[280px] shrink-0 snap-start min-h-[160px]"
            />
          );
        })}

        {/* Dashed Add / See More Investment Card */}
        <div className="w-[180px] shrink-0 snap-start min-h-[160px]">
          <Link
            to="/portfolio"
            className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[160px] bg-[#131316]/80 border border-zinc-800 hover:border-emerald-500/50 hover:bg-[#18181c] rounded-2xl p-3.5 text-center transition-all group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              {hasMore ? <ArrowRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                {hasMore ? `See More (${items.length - 5} more)` : "Add Investment"}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 leading-tight">
                {hasMore ? "View all portfolio" : "Track MMF, Stocks & FX"}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
