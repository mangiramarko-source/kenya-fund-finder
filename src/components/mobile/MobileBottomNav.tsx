import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Newspaper,
  TrendingUp,
  Landmark,
  PieChart,
  MoreHorizontal,
} from "lucide-react";
import MobileMoreDrawer from "./MobileMoreDrawer";

export default function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = location.pathname;

  const activeTab = useMemo(() => {
    if (pathname === "/" || pathname === "/overview" || pathname === "/news" || pathname.startsWith("/news/")) return "news";
    if (pathname === "/stocks" || pathname.startsWith("/stocks/")) return "stocks";
    if (pathname === "/funds" || pathname === "/money-market-funds-kenya" || pathname.startsWith("/compare/")) return "funds";
    if (pathname === "/portfolio" || pathname.startsWith("/portfolio/") || pathname === "/watchlist") return "portfolio";
    return "";
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-border/80 dark:border-border/20 bg-background/95 backdrop-blur-xl pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      >
        <div className="flex h-16 items-center justify-around px-2">
          {/* 1. News */}
          <NavTab
            to="/"
            icon={Newspaper}
            label="News"
            isActive={activeTab === "news"}
          />

          {/* 2. Stocks */}
          <NavTab
            to="/stocks"
            icon={TrendingUp}
            label="Stocks"
            isActive={activeTab === "stocks"}
          />

          {/* 3. MMFs */}
          <NavTab
            to="/funds"
            icon={Landmark}
            label="MMFs"
            isActive={activeTab === "funds"}
          />

          {/* 4. My Assets (Portfolio & Watchlist) */}
          <NavTab
            to="/portfolio"
            icon={PieChart}
            label="My Assets"
            isActive={activeTab === "portfolio"}
          />

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Open more tools and markets menu"
            className="group flex flex-1 flex-col items-center justify-center py-0.5 transition-all"
          >
            <div
              className={`relative flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
                moreOpen
                  ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400 font-bold"
                  : "text-zinc-950 dark:text-muted-foreground group-hover:text-foreground"
              }`}
            >
              <MoreHorizontal
                className={`h-5 w-5 ${
                  moreOpen ? "stroke-[2.2]" : "stroke-[2]"
                }`}
              />
            </div>
            <span
              className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
                moreOpen
                  ? "font-bold text-emerald-600 dark:text-emerald-400"
                  : "font-semibold text-zinc-950 dark:text-muted-foreground dark:font-medium group-hover:text-foreground"
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Bottom Sheet Drawer for "More" */}
      <MobileMoreDrawer open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}

function NavTab({
  to,
  icon: Icon,
  label,
  isActive,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-1 flex-col items-center justify-center py-0.5 transition-all"
    >
      <div
        className={`relative flex h-8 w-11 items-center justify-center rounded-full transition-all duration-200 ${
          isActive
            ? "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400 font-bold"
            : "text-zinc-950 dark:text-muted-foreground group-hover:text-foreground"
        }`}
      >
        <Icon className={`h-5 w-5 ${isActive ? "stroke-[2.4]" : "stroke-[2]"}`} />
      </div>
      <span
        className={`text-[10px] tracking-tight mt-0.5 transition-colors ${
          isActive
            ? "font-bold text-emerald-600 dark:text-emerald-400"
            : "font-semibold text-zinc-950 dark:text-muted-foreground dark:font-medium group-hover:text-foreground"
        }`}
      >
        {label}
      </span>
    </Link>
  );
}
