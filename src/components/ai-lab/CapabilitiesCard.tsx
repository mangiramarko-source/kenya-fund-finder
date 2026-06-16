import { Check, X } from "lucide-react";

const CAN_DO = [
  "Calculate yield scenarios",
  "Explain financial terms",
  "Compare data points",
  "Show possible upside/downside scenarios",
  "Summarize assumptions",
];

const CANT_DO = [
  "Tell you what to buy",
  "Tell you what to sell",
  "Recommend a specific fund or stock",
  "Guarantee returns",
  "Replace a licensed financial adviser",
];

const CapabilitiesCard = () => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-4 sticky top-4">
    <div>
      <h3 className="text-sm font-semibold mb-2">What this assistant can do</h3>
      <ul className="space-y-1.5">
        {CAN_DO.map((c) => (
          <li key={c} className="flex items-start gap-2 text-xs text-foreground/80">
            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
    <div className="h-px bg-border" />
    <div>
      <h3 className="text-sm font-semibold mb-2">What it can't do</h3>
      <ul className="space-y-1.5">
        {CANT_DO.map((c) => (
          <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default CapabilitiesCard;
