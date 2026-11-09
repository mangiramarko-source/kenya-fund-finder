import React from "react";
import { Link } from "react-router-dom";
import {
  Compass,
  PiggyBank,
  Users,
  Calculator,
  Gem,
  GitCompareArrows,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

interface DesktopNavigationShortcutsCardProps {
  className?: string;
}

export const DesktopNavigationShortcutsCard: React.FC<DesktopNavigationShortcutsCardProps> = ({
  className = "",
}) => {
  const categories = [
    {
      title: "Savings & Fixed Income",
      items: [
        {
          name: "Bank Fixed Deposits",
          subtitle: "Commercial bank deposit rates",
          to: "/savings",
          icon: PiggyBank,
          color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        },
        {
          name: "SACCO Dividends",
          subtitle: "Regulated society returns",
          to: "/savings?tab=saccos",
          icon: Users,
          color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        },
      ],
    },
    {
      title: "Markets & Tools",
      items: [
        {
          name: "Financial Calculators",
          subtitle: "MMF & T-Bill compounding tools",
          to: "/calculator",
          icon: Calculator,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        },
        {
          name: "Commodities Market",
          subtitle: "Tea, Coffee, Gold & Fuel prices",
          to: "/commodities",
          icon: Gem,
          color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        },
        {
          name: "Compare Assets",
          subtitle: "Side-by-side stocks, funds & FX",
          to: "/compare",
          icon: GitCompareArrows,
          color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
        },
      ],
    },
    {
      title: "Education & Research",
      items: [
        {
          name: "Learn & Guides",
          subtitle: "Beginner to advanced investing",
          to: "/learn",
          icon: GraduationCap,
          color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        },
      ],
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Floating Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-emerald-500" />
          <h3 className="text-sm font-bold text-foreground">Explore &amp; Tools</h3>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Shortcuts
        </span>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.title} className="space-y-1.5">
            <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1">
              {cat.title}
            </h4>

            <div className="space-y-1.5">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.to}
                    className="flex items-center justify-between p-2.5 rounded-2xl border border-border/70 bg-card hover:border-emerald-500/40 hover:bg-muted/40 shadow-xs transition-all group text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${item.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-foreground tracking-tight group-hover:text-emerald-500 transition-colors truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
