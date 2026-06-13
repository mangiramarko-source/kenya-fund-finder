import { Info } from "lucide-react";

interface DisclaimerBlockProps {
  /** Optional extra paragraph appended after the shared notice (e.g. fund-type specific). */
  extra?: string;
  className?: string;
  variant?: "default" | "compact";
}

const SHARED_DISCLAIMER =
  "KenyaFundFinder provides general investment information and comparison data. We are not a fund manager, broker, investment adviser, or bank. We do not hold client money. This information is not personal financial advice. Please verify details with the fund manager, broker, CMA, or a licensed adviser before making investment decisions.";

const DisclaimerBlock = ({ extra, className = "", variant = "default" }: DisclaimerBlockProps) => {
  if (variant === "compact") {
    return (
      <p className={`text-[11px] text-muted-foreground/70 leading-relaxed ${className}`}>
        <Info className="inline h-3 w-3 mr-1 -mt-0.5 text-muted-foreground/60" />
        {SHARED_DISCLAIMER}
        {extra ? ` ${extra}` : ""}
      </p>
    );
  }
  return (
    <div className={`rounded-xl border border-border/60 bg-muted/30 p-4 ${className}`}>
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground/70 shrink-0 mt-0.5" />
        <div className="space-y-2 text-[11px] text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground/80">Important:</strong> {SHARED_DISCLAIMER}
          </p>
          {extra && <p>{extra}</p>}
        </div>
      </div>
    </div>
  );
};

export default DisclaimerBlock;
