import { Eye, EyeOff } from "lucide-react";

interface PortfolioSensitiveValueProps {
  value: string;
  visible: boolean;
  className?: string;
}

export function PortfolioSensitiveValue({ value, visible, className = "" }: PortfolioSensitiveValueProps) {
  return <span className={className}>{visible ? value : "••••••"}</span>;
}

interface PortfolioValueToggleProps {
  visible: boolean;
  onToggle: () => void;
}

export default function PortfolioValueToggle({ visible, onToggle }: PortfolioValueToggleProps) {
  const label = visible ? "Hide portfolio values" : "Show portfolio values";
  const Icon = visible ? EyeOff : Eye;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={visible}
      title={label}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
