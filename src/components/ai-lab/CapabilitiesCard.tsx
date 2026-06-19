import { Check, Info, X } from "lucide-react";
import { AI_LAB_DIVIDER, AI_LAB_LABEL, AI_LAB_RAIL_CARD } from "@/components/ai-lab/aiLabTheme";

const CAN_DO = [
  "Calculate MMF yield and income scenarios",
  "Estimate stock exposure and price-move scenarios",
  "Project savings goals with monthly contributions",
  "Compare funds, stocks, FX, and commodities side by side",
  "Convert currencies and model FX or commodity moves",
  "Summarize matching news from stored KenyaFundFinder articles",
  "Model MMF + stock portfolio split scenarios",
  "Explain financial terms (yield, NAV, T-bills, and more)",
];

const CANT_DO = [
  "Tell you what to buy",
  "Tell you what to sell",
  "Recommend a specific fund, stock, or allocation",
  "Guarantee returns",
  "Replace a licensed financial adviser",
];

const LIMITS = [
  "Admin-only gate by default — controlled beta not enabled yet",
  "Deterministic routing only — no LLM",
  "Uses available KenyaFundFinder data only",
  "Does not save portfolios or scenario history",
];

const CapabilitiesCard = () => (
  <div className={AI_LAB_RAIL_CARD}>
    <div className="space-y-4">
      <div>
        <h3 className={`${AI_LAB_LABEL} mb-2`}>What this assistant can do</h3>
        <ul className="space-y-1.5">
          {CAN_DO.map((c) => (
            <li key={c} className="flex items-start gap-2 text-xs text-foreground">
              <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={AI_LAB_DIVIDER} />
      <div>
        <h3 className={`${AI_LAB_LABEL} mb-2`}>What it can&apos;t do</h3>
        <ul className="space-y-1.5">
          {CANT_DO.map((c) => (
            <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
              <X className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={AI_LAB_DIVIDER} />
      <div>
        <h3 className={`${AI_LAB_LABEL} mb-2`}>Preview limits</h3>
        <ul className="space-y-1.5">
          {LIMITS.map((c) => (
            <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export default CapabilitiesCard;
