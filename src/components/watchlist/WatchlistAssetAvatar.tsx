import { useState } from "react";
import FundLogo from "@/components/home/FundLogo";
import { getFundManagerLogoUrl } from "@/lib/fundBranding";
import { getStockLogoUrl } from "@/lib/stockBranding";
import { getCurrencyFlagUrl } from "@/lib/currencyBranding";
import { Coins, Fuel, Sparkles, Coffee, Leaf, Wheat, Gem } from "lucide-react";

export type WatchlistAssetType = "fund" | "stock" | "currency" | "commodity";

export interface WatchlistAssetAvatarProps {
  type: WatchlistAssetType;
  symbol?: string;
  name: string;
  manager?: string | null;
  logoUrl?: string | null;
  currencyCode?: string;
  size?: number;
  className?: string;
}

export default function WatchlistAssetAvatar({
  type,
  symbol,
  name,
  manager,
  logoUrl,
  currencyCode,
  size = 36,
  className = "",
}: WatchlistAssetAvatarProps) {
  const [stockFailed, setStockFailed] = useState(false);
  const [currencyFailed, setCurrencyFailed] = useState(false);

  if (type === "fund") {
    const resolvedLogo = getFundManagerLogoUrl(manager, logoUrl);
    return (
      <FundLogo
        name={manager || name}
        logoUrl={resolvedLogo}
        size={size}
        className={className}
      />
    );
  }

  if (type === "stock") {
    const ticker = (symbol || name.slice(0, 4)).toUpperCase();
    const resolvedLogo = getStockLogoUrl(ticker, logoUrl);
    const hash = Array.from(ticker).reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hue = hash % 360;
    const bg = `hsl(${hue} 60% 90%)`;
    const fg = `hsl(${hue} 50% 30%)`;
    const initials = ticker.slice(0, 2);

    if (resolvedLogo && !stockFailed) {
      return (
        <img
          src={resolvedLogo}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setStockFailed(true)}
          className={`rounded-full border border-border/40 bg-white object-contain p-0.5 shrink-0 ${className}`}
          style={{ width: size, height: size }}
        />
      );
    }

    return (
      <div
        aria-hidden
        className={`rounded-full flex items-center justify-center font-bold border border-border/40 shrink-0 ${className}`}
        style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
      >
        {initials}
      </div>
    );
  }

  if (type === "currency") {
    const code = (currencyCode || symbol?.split("/")[0] || name.slice(0, 3)).toUpperCase();
    const flagUrl = getCurrencyFlagUrl(code);

    if (flagUrl && !currencyFailed) {
      return (
        <img
          src={flagUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setCurrencyFailed(true)}
          className={`rounded-full border border-border/40 object-cover shrink-0 ${className}`}
          style={{ width: size, height: size }}
        />
      );
    }

    return (
      <div
        aria-hidden
        className={`rounded-full flex items-center justify-center font-bold border border-border/40 bg-muted text-muted-foreground shrink-0 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
      >
        {code.slice(0, 2)}
      </div>
    );
  }

  // Commodity
  const s = (symbol || "").toLowerCase();
  const n = name.toLowerCase();

  let Icon = Gem;
  let toneClass = "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-800/40";

  if (s.includes("xau") || n.includes("gold")) {
    Icon = Coins;
    toneClass = "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200/80 dark:border-amber-800/40";
  } else if (s.includes("brent") || s.includes("oil") || n.includes("oil") || n.includes("crude")) {
    Icon = Fuel;
    toneClass = "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300/80 dark:border-slate-700/40";
  } else if (s.includes("xag") || n.includes("silver")) {
    Icon = Sparkles;
    toneClass = "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300/80 dark:border-zinc-700/40";
  } else if (s.includes("cof") || n.includes("coffee")) {
    Icon = Coffee;
    toneClass = "bg-amber-100/80 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40";
  } else if (s.includes("tea") || n.includes("tea")) {
    Icon = Leaf;
    toneClass = "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/40";
  } else if (s.includes("wheat") || n.includes("wheat") || s.includes("corn") || n.includes("maize")) {
    Icon = Wheat;
    toneClass = "bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-400 border-yellow-200/80 dark:border-yellow-800/40";
  }

  const iconSize = Math.max(14, Math.round(size * 0.45));

  return (
    <div
      aria-hidden
      className={`rounded-full flex items-center justify-center border shrink-0 ${toneClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}
