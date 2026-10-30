import React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  PieChart,
  TrendingUp,
  DollarSign,
  Gem,
  Landmark,
} from "lucide-react";
import WatchlistAssetAvatar from "@/components/watchlist/WatchlistAssetAvatar";

export type OverviewCardType = "holding" | "watching";

export interface OverviewAssetCardProps {
  type: OverviewCardType;
  title: string;
  subtitle?: string;
  categoryLabel: string;
  badgeLabel?: string;
  badgeTone?: "emerald" | "amber" | "sky" | "purple";
  primaryValue: string;
  secondaryValue?: string;
  statLabel?: string;
  oneDay?: {
    available: boolean;
    percent: number | null;
    amount?: number | null;
    unit?: string;
    amountSuffix?: string;
  };
  assetType?: "stock" | "fund" | "mmf" | "currency" | "fx" | "commodity" | "fixed_income" | string;
  symbol?: string;
  logoUrl?: string | null;
  manager?: string | null;
  currencyCode?: string;
  visual?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

const getAssetIcon = (assetType?: string) => {
  const normalized = assetType?.toLowerCase();
  switch (normalized) {
    case "stock":
      return {
        icon: TrendingUp,
        bg: "bg-emerald-500/10 border-emerald-500/25",
        color: "text-emerald-400",
      };
    case "fund":
    case "mmf":
    case "unit_trust":
      return {
        icon: PieChart,
        bg: "bg-purple-500/10 border-purple-500/25",
        color: "text-purple-400",
      };
    case "currency":
    case "fx":
      return {
        icon: DollarSign,
        bg: "bg-cyan-500/10 border-cyan-500/25",
        color: "text-cyan-400",
      };
    case "commodity":
      return {
        icon: Gem,
        bg: "bg-amber-500/10 border-amber-500/25",
        color: "text-amber-400",
      };
    case "fixed_income":
    case "bond":
      return {
        icon: Landmark,
        bg: "bg-blue-500/10 border-blue-500/25",
        color: "text-blue-400",
      };
    default:
      return {
        icon: PieChart,
        bg: "bg-rose-500/10 border-rose-500/25",
        color: "text-rose-400",
      };
  }
};

const isAvatarSupported = (assetType?: string): boolean => {
  const norm = assetType?.toLowerCase();
  return (
    norm === "stock" ||
    norm === "fund" ||
    norm === "mmf" ||
    norm === "unit_trust" ||
    norm === "currency" ||
    norm === "fx" ||
    norm === "commodity"
  );
};

const getWatchlistAssetType = (
  assetType?: string
): "stock" | "fund" | "currency" | "commodity" => {
  const norm = assetType?.toLowerCase();
  if (norm === "stock") return "stock";
  if (norm === "fund" || norm === "mmf" || norm === "unit_trust") return "fund";
  if (norm === "currency" || norm === "fx") return "currency";
  if (norm === "commodity") return "commodity";
  return "stock";
};

const isCurrencyType = (assetType?: string): boolean => {
  const norm = assetType?.toLowerCase();
  return norm === "currency" || norm === "fx";
};

const getBadgeStyles = (tone?: "emerald" | "amber" | "sky" | "purple") => {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
    case "amber":
      return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    case "purple":
      return "bg-purple-500/10 border-purple-500/30 text-purple-300";
    case "sky":
    default:
      return "bg-sky-500/10 border-sky-500/30 text-sky-400";
  }
};

export default function OverviewAssetCard({
  type,
  title,
  subtitle,
  categoryLabel,
  badgeLabel,
  badgeTone = type === "holding" ? "emerald" : "sky",
  primaryValue,
  secondaryValue,
  statLabel = "1D Move",
  oneDay,
  assetType,
  symbol,
  logoUrl,
  manager,
  currencyCode,
  visual,
  onClick,
  className = "",
}: OverviewAssetCardProps) {
  const iconConfig = getAssetIcon(assetType);
  const IconComponent = iconConfig.icon;
  const badgeClass = getBadgeStyles(badgeTone);

  const isPositive = oneDay?.percent != null && oneDay.percent > 0;
  const isNegative = oneDay?.percent != null && oneDay.percent < 0;
  const isFlat = oneDay?.percent != null && oneDay.percent === 0;

  const DirectionIcon = isPositive
    ? ArrowUpRight
    : isNegative
    ? ArrowDownRight
    : Minus;

  const directionTone = isPositive
    ? "text-emerald-400"
    : isNegative
    ? "text-rose-500"
    : "text-zinc-400";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`group w-[245px] sm:w-[260px] min-h-[148px] shrink-0 snap-start bg-[#131316] border border-zinc-800/90 hover:border-zinc-700 hover:bg-[#18181c] rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md select-none ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {visual ? (
            <div className="shrink-0">{visual}</div>
          ) : isAvatarSupported(assetType) ? (
            <WatchlistAssetAvatar
              type={getWatchlistAssetType(assetType)}
              symbol={symbol || subtitle || title}
              name={title}
              manager={manager}
              logoUrl={logoUrl}
              currencyCode={
                currencyCode ||
                (isCurrencyType(assetType)
                  ? (symbol || subtitle)?.split("/")[0]
                  : undefined)
              }
              size={28}
            />
          ) : (
            <div
              className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${iconConfig.bg}`}
            >
              <IconComponent className={`h-3.5 w-3.5 ${iconConfig.color}`} />
            </div>
          )}
          {subtitle && (
            <span className="text-[11px] font-bold tracking-wide text-zinc-400 group-hover:text-zinc-200 truncate transition-colors">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="px-1.5 py-0.5 text-[8.5px] rounded font-bold tracking-wider uppercase bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
            {categoryLabel}
          </span>
          {badgeLabel && (
            <span
              className={`px-1.5 py-0.5 text-[8.5px] rounded-full font-bold tracking-wider uppercase border ${badgeClass}`}
            >
              {badgeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Main Content / Primary Hero Metric */}
      <div className="my-2">
        <h3 className="text-white text-xs sm:text-sm font-bold leading-tight tracking-tight truncate group-hover:text-white/95">
          {title}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-white font-extrabold text-base sm:text-lg tracking-tight tabular-nums">
            {primaryValue}
          </span>
        </div>
        {secondaryValue && (
          <div className="text-[10px] sm:text-[11px] text-zinc-400 font-medium truncate mt-0.5">
            {secondaryValue}
          </div>
        )}
      </div>

      {/* Bottom Performance Row */}
      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[10px] sm:text-[11px]">
        <span className="text-zinc-400 font-medium">{statLabel}</span>
        {oneDay?.available && oneDay.percent != null ? (
          <div className="flex items-center gap-1.5 tabular-nums">
            <span
              className={`inline-flex items-center gap-0.5 font-bold ${directionTone}`}
            >
              <DirectionIcon className="h-3 w-3 stroke-[2.5]" />
              {isPositive ? "+" : ""}
              {oneDay.percent.toFixed(2)}%
            </span>
            {oneDay.amount != null && (
              <span className="text-zinc-300 font-medium">
                ({oneDay.unit || "KES"} {Math.abs(oneDay.amount).toFixed(2)}{oneDay.amountSuffix || ""})
              </span>
            )}
          </div>
        ) : (
          <span className="text-zinc-500 font-medium">Market Steady</span>
        )}
      </div>
    </div>
  );
}
