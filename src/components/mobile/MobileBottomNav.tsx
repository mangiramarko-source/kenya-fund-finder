import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Newspaper,
  TrendingUp,
  Landmark,
  PiggyBank,
  PieChart,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import MobileMoreDrawer from "./MobileMoreDrawer";

type TabKey = "news" | "stocks" | "funds" | "banking" | "portfolio";

const PRIMARY_TABS: Array<{ key: TabKey; to: string; icon: React.ElementType; label: string }> = [
  { key: "news", to: "/", icon: Newspaper, label: "News" },
  { key: "stocks", to: "/stocks", icon: TrendingUp, label: "Stocks" },
  { key: "funds", to: "/funds", icon: Landmark, label: "MMFs" },
  { key: "banking", to: "/savings", icon: PiggyBank, label: "Banking" },
  { key: "portfolio", to: "/portfolio", icon: PieChart, label: "My Assets" },
];

const DOCK_GLASS_SURFACE =
  "border border-border/80 bg-card/95 supports-[backdrop-filter]:bg-card/85 backdrop-blur-2xl shadow-[0_12px_36px_-10px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.28)] dark:border-white/12 dark:bg-card/92 dark:supports-[backdrop-filter]:bg-card/80 dark:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.08)]";

/**
 * Split iOS-style floating frosted glass dock: 5-tab navigation capsule on the left
 * paired with a detached circular More glass button on the right.
 */
export default function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = location.pathname;

  const activeTab = useMemo(() => {
    if (pathname === "/" || pathname === "/overview" || pathname === "/news" || pathname.startsWith("/news/")) return "news";
    if (pathname === "/stocks" || pathname.startsWith("/stocks/")) return "stocks";
    if (pathname === "/funds" || pathname === "/money-market-funds-kenya" || pathname.startsWith("/compare/")) return "funds";
    if (pathname === "/savings" || pathname === "/fixed-deposits" || pathname === "/saccos" || pathname.startsWith("/savings")) return "banking";
    if (pathname === "/portfolio" || pathname.startsWith("/portfolio/") || pathname === "/watchlist") return "portfolio";
    return "";
  }, [pathname]);

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className="pointer-events-none fixed inset-x-2.5 bottom-[max(0.65rem,env(safe-area-inset-bottom))] z-50 md:hidden min-[390px]:inset-x-3"
      >
        <div className="mx-auto flex max-w-md items-center gap-1.5 min-[390px]:gap-2">
          {/* Primary 5-tab floating glass pill */}
          <div
            data-testid="mobile-nav-pill"
            className={cn(
              "pointer-events-auto flex h-[56px] min-w-0 flex-1 items-center rounded-full p-1 min-[390px]:h-[60px]",
              DOCK_GLASS_SURFACE
            )}
          >
            {PRIMARY_TABS.map((tab) => (
              <NavTab
                key={tab.key}
                to={tab.to}
                icon={tab.icon}
                label={tab.label}
                isActive={activeTab === tab.key}
              />
            ))}
          </div>

          {/* Detached circular More glass orb */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label="Open more tools and markets menu"
            className={cn(
              "group pointer-events-auto relative flex h-[56px] w-[56px] shrink-0 touch-manipulation select-none items-center justify-center rounded-full transition-transform duration-200 active:scale-95 min-[390px]:h-[60px] min-[390px]:w-[60px]",
              DOCK_GLASS_SURFACE
            )}
          >
            <div
              className={cn(
                "flex h-[46px] w-[46px] flex-col items-center justify-center rounded-full transition-colors duration-200 min-[390px]:h-[50px] min-[390px]:w-[50px]",
                moreOpen && "bg-foreground/[0.08] dark:bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              )}
            >
              <MoreHorizontal
                className={cn(
                  "h-[18px] w-[18px] transition-colors",
                  moreOpen
                    ? "stroke-[2.3] text-emerald-600 dark:text-emerald-400"
                    : "stroke-[1.9] text-zinc-950 dark:text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span
                className={cn(
                  "mt-0.5 text-[9.5px] leading-tight tracking-tight transition-colors min-[380px]:text-[10px]",
                  moreOpen
                    ? "font-bold text-emerald-600 dark:text-emerald-400"
                    : "font-semibold text-zinc-950 dark:text-muted-foreground dark:font-medium group-hover:text-foreground"
                )}
              >
                More
              </span>
            </div>
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
      className={cn(
        "group flex h-full min-w-0 flex-1 touch-manipulation select-none flex-col items-center justify-center rounded-full px-0.5 transition-all duration-200 active:scale-95",
        isActive && "bg-foreground/[0.08] dark:bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] transition-colors",
          isActive
            ? "stroke-[2.35] text-emerald-600 dark:text-emerald-400"
            : "stroke-[1.9] text-zinc-950 dark:text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span
        className={cn(
          "mt-0.5 max-w-full truncate text-[9.5px] leading-tight tracking-tight transition-colors min-[380px]:text-[10px]",
          isActive
            ? "font-bold text-emerald-600 dark:text-emerald-400"
            : "font-semibold text-zinc-950 dark:text-muted-foreground dark:font-medium group-hover:text-foreground"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
