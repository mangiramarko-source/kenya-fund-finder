import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { PortfolioEvent } from "@/lib/portfolioEventsStorage";

interface Props {
  events: PortfolioEvent[];
  isLoading?: boolean;
  currency?: "KES" | "USD";
}

const fmt = (val: number | null, currency: "KES" | "USD") => {
  if (val == null) return "—";
  const v = currency === "USD" ? val / 130 : val;
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const TYPE_META: Record<PortfolioEvent["event_type"], { label: string; icon: any; tone: string }> = {
  add: { label: "Added holding", icon: Plus, tone: "bg-accent/15 text-accent border-accent/30" },
  update: { label: "Updated holding", icon: Pencil, tone: "bg-primary/15 text-primary border-primary/30" },
  remove: { label: "Removed holding", icon: Trash2, tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PortfolioActivity = ({ events, isLoading, currency = "KES" }: Props) => {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-primary">Portfolio activity</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Portfolio activity is based on changes you make to your holdings. It is general information only and is not personal financial advice.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>
        ) : events.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No portfolio activity yet. Add or edit a holding to see it here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => {
              const meta = TYPE_META[e.event_type] ?? TYPE_META.update;
              const Icon = meta.icon;
              return (
                <li key={e.id} className="py-2.5 flex items-start gap-3">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded border text-xs ${meta.tone}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-foreground truncate">{e.asset_name}</span>
                      <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                      <span>{format(new Date(e.event_date), "d MMM yyyy, HH:mm")}</span>
                      {e.amount != null && <span>Value: {fmt(e.amount, currency)}</span>}
                      {e.quantity != null && <span>Qty: {Number(e.quantity).toLocaleString()}</span>}
                    </div>
                    {e.note && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic">“{e.note}”</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioActivity;
