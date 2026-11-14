import { Bell, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useEmailPreferences, type EmailPreferences } from "@/hooks/useEmailPreferences";
import { toast } from "sonner";

function PreferenceRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border/60 py-3 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={title} />
    </div>
  );
}

const IN_APP_CATEGORIES: Array<{
  key: keyof EmailPreferences;
  title: string;
  description: string;
}> = [
  {
    key: "price_alert_inapp",
    title: "Price & Yield Target Alerts",
    description: "Top notification bar and drawer alert whenever your price or yield target hits.",
  },
  {
    key: "portfolio_daily_inapp",
    title: "Daily Portfolio Close Summary",
    description: "Weekday close valuation, daily P&L, and top movers across your saved holdings.",
  },
  {
    key: "watchlist_mover_inapp",
    title: "Watchlist & Portfolio Stock Movers",
    description: "Notify when a stock you track or hold moves 3% or more in a trading day.",
  },
  {
    key: "mmf_yield_inapp",
    title: "MMF Yield Shifts",
    description: "Notify when a saved or held Money Market Fund changes yield by 25 bps or more.",
  },
  {
    key: "tbill_auction_inapp",
    title: "CBK T-Bill Auction Results",
    description: "Weekly accepted average rates for 91-day, 182-day, and 364-day Treasury Bills.",
  },
  {
    key: "market_brief_inapp",
    title: "NSE Market Close Brief",
    description: "End-of-day market breadth, top gainers, and USD/KES summary.",
  },
  {
    key: "admin_broadcast_inapp",
    title: "Platform & Market Announcements",
    description: "Important KenyaFundFinder product updates and featured market insights.",
  },
];

export function NotificationPreferencesSection() {
  const { prefs, loading, saving, updatePref } = useEmailPreferences();

  const handleToggle = async (key: keyof EmailPreferences, value: boolean) => {
    const ok = await updatePref(key, value);
    if (!ok) {
      toast.error("Couldn't save your notification preference. Please try again.");
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">In-App Notification Bar &amp; Bell</h3>
          </div>
          {IN_APP_CATEGORIES.map((item) => (
            <PreferenceRow
              key={item.key}
              title={item.title}
              description={item.description}
              checked={prefs[item.key]}
              onChange={(value) => void handleToggle(item.key, value)}
              disabled={loading || saving}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Email Notifications</h3>
          </div>
          <PreferenceRow
            title="Instant Price Alerts"
            description="Email preference for triggered market alerts."
            checked={prefs.price_alert_email}
            onChange={(value) => void handleToggle("price_alert_email", value)}
            disabled={loading || saving}
          />
          <PreferenceRow
            title="Market Brief & Morning News"
            description="Market Brief updates plus weekday morning News Highlights from stored, quality-checked articles."
            checked={prefs.market_brief_email}
            onChange={(value) => void handleToggle("market_brief_email", value)}
            disabled={loading || saving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
