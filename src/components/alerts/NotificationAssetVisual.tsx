import { useState } from "react";
import { Coffee, Landmark, Megaphone, PiggyBank, TrendingUp, WalletCards } from "lucide-react";
import type { AppNotification } from "./NotificationProvider";
import { getCurrencyFlagUrl } from "@/lib/currencyBranding";

export function NotificationAssetVisual({
  notification,
  symbol,
}: {
  notification: AppNotification;
  symbol: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const flagUrl = notification.assetType === "currency" ? getCurrencyFlagUrl(symbol) : undefined;
  const label = notification.assetName ?? notification.title;

  if (notification.type === "portfolio_daily") {
    return <WalletCards className="h-5 w-5 text-foreground/80" aria-label="Portfolio" />;
  }
  if (notification.type === "tbill_auction") {
    return <Landmark className="h-5 w-5 text-foreground/80" aria-label="CBK Treasury" />;
  }
  if (notification.type === "market_close_brief") {
    return <TrendingUp className="h-5 w-5 text-foreground/80" aria-label="Market Brief" />;
  }
  if (notification.type === "admin_broadcast") {
    return <Megaphone className="h-5 w-5 text-foreground/80" aria-label="Announcement" />;
  }

  if (notification.assetVisualUrl && !imageFailed) {
    return (
      <img
        src={notification.assetVisualUrl}
        alt={`${label} logo`}
        className="h-full w-full object-contain p-1.5"
        onError={() => setImageFailed(true)}
      />
    );
  }
  if (flagUrl && !imageFailed) {
    return (
      <img
        src={flagUrl}
        alt={`${symbol} flag`}
        className="h-5 w-5 rounded-full object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }
  if (notification.assetType === "commodity") {
    return <Coffee className="h-5 w-5 text-foreground/80" aria-label="Commodity" />;
  }
  if (notification.type === "mmf_yield_shift") {
    return <PiggyBank className="h-5 w-5 text-foreground/80" aria-label="Money Market Fund" />;
  }

  return <span className="text-xs font-black tracking-wide text-current">{symbol?.slice(0, 3) ?? "KFF"}</span>;
}
