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
  add: { label: "Added", icon: Plus, tone: "bg-accent/15 text-accent border-accent/30" },
  update: { label: "Updated", icon: Pencil, tone: "bg-primary/15 text-primary border-primary/30" },
  remove: { label: "Removed", icon: Trash2, tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

const PortfolioActivity = ({ events, isLoading, currency = "KES" }: Props) => {
  if (isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Loading activity…
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm font-medium text-foreground">No portfolio activity yet</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          When you add, edit or remove a holding, the change will appear here as a timestamped entry.
        </p>
      </div>
    );
  }
  return (
    <div>
      <ul className="divide-y divide-border">
        {events.map((e) => {
          const meta = TYPE_META[e.event_type] ?? TYPE_META.update;
          const Icon = meta.icon;
          return (
            <li key={e.id} className="py-2.5 flex items-start gap-3">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded border text-xs shrink-0 ${meta.tone}`}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-medium text-foreground truncate">{e.asset_name}</span>
                  <Badge variant="outline" className="text-[10px]">{meta.label}</Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
                  <span>{format(new Date(e.event_date), "d MMM yyyy, HH:mm")}</span>
                  {e.amount != null && <span>Value: {fmt(e.amount, currency)}</span>}
                  {e.quantity != null && <span>Qty: {Number(e.quantity).toLocaleString()}</span>}
                </div>
                {e.note && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 italic break-words">“{e.note}”</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/60">
        Activity is based on changes you make to your holdings. General information only — not personal financial advice.
      </p>
    </div>
  );
};

export default PortfolioActivity;
