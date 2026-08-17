import { ArrowDownRight, ArrowUpDown, ArrowUpRight, Minus } from "lucide-react";
import { type NewsAiAnalysis } from "@/lib/api";

interface DecisionDriversProps {
  drivers?: NewsAiAnalysis["decision_drivers"];
}

const toneConfig = {
  positive: {
    icon: ArrowUpRight,
    className: "text-emerald-500",
  },
  negative: {
    icon: ArrowDownRight,
    className: "text-rose-500",
  },
  mixed: {
    icon: ArrowUpDown,
    className: "text-amber-400",
  },
  neutral: {
    icon: Minus,
    className: "text-muted-foreground",
  },
};

export function DecisionDrivers({ drivers }: DecisionDriversProps) {
  const visibleDrivers = (drivers || [])
    .filter((item) => item?.driver?.trim() && item?.explanation?.trim())
    .slice(0, 4);

  if (visibleDrivers.length === 0) return null;

  return (
    <section className="space-y-3 border-b border-border pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-foreground/90">
          Decision Drivers
        </h3>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          what this story touches
        </span>
      </div>
      <div className="space-y-3">
        {visibleDrivers.map((item, index) => {
          const tone = item.direction && toneConfig[item.direction] ? item.direction : "neutral";
          const Icon = toneConfig[tone].icon;
          return (
            <div key={`${item.driver}-${index}`} className="flex gap-2.5">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${toneConfig[tone].className}`} />
              <p className="text-[14px] leading-relaxed text-foreground/85">
                <span className="font-bold text-foreground">{item.driver}: </span>
                {item.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
