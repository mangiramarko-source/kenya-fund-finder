import { Link, useNavigate } from "react-router-dom";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAuth } from "@/hooks/useAuth";
import PortfolioHoldingCard from "@/components/portfolio/PortfolioHoldingCard";
import { ArrowRight, Briefcase } from "lucide-react";

export default function OverviewPortfolioWidget() {
  const { user } = useAuth();
  const { items, totalValue } = usePortfolio();
  const navigate = useNavigate();

  if (items.length === 0) {
    return null; // hide if empty
  }

  // Max of 4 items
  const displayItems = items.slice(0, 4);
  const hasMore = items.length > 4;

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
          <Briefcase className="h-4 w-4 text-[#00A651]" />
          Your Portfolio
        </h2>
        <Link
          to="/portfolio"
          className="text-xs font-bold text-[#00A651] hover:underline flex items-center gap-0.5"
        >
          Manage
        </Link>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
        {displayItems.map((item) => (
          <PortfolioHoldingCard
            key={item.id}
            item={item}
            currency="KES" // Default to KES for overview widget
            totalValue={totalValue}
            onClick={() => navigate("/portfolio")}
            className="w-[85vw] max-w-[320px] shrink-0 snap-center"
          />
        ))}

        {hasMore && (
          <div className="w-[150px] shrink-0 snap-center flex items-center justify-center">
            <Link
              to="/portfolio"
              className="flex flex-col items-center justify-center gap-2 w-full h-full min-h-[80px] bg-card border border-dashed border-border/75 hover:border-emerald-500/50 hover:text-emerald-500 rounded-2xl py-3 text-sm font-semibold text-muted-foreground transition-all"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xs">View all {items.length}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
