import { Info } from "lucide-react";
import {
  AI_LAB_CARD,
  AI_LAB_COLLAPSIBLE,
  AI_LAB_LABEL,
  AI_LAB_METRIC,
  AI_LAB_METRIC_CARD,
  AI_LAB_METRIC_LG,
  AI_LAB_NEGATIVE,
  AI_LAB_POSITIVE,
  AI_LAB_SECTION,
} from "./aiLabTheme";

export const fmtKES = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n);

export const fmtKES2 = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
  }).format(n);

export const signedColorClass = (n: number) =>
  n > 0 ? AI_LAB_POSITIVE : n < 0 ? AI_LAB_NEGATIVE : "text-muted-foreground";

export const ResultShell = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`${AI_LAB_CARD} p-3 md:p-4 space-y-3 ${className}`}>{children}</div>
);

export const SummaryMetricGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
);

export const SummaryMetricCard = ({
  label,
  value,
  valueClassName = "",
  sublabel,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
  sublabel?: string;
}) => (
  <div className={AI_LAB_METRIC_CARD}>
    <p className={AI_LAB_LABEL}>{label}</p>
    <p className={`${AI_LAB_METRIC_LG} mt-2 ${valueClassName}`}>{value}</p>
    {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
  </div>
);

export const Section = ({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) => (
  <div className={AI_LAB_SECTION}>
    <div className="flex items-center gap-1.5 mb-3 text-muted-foreground">
      {icon}
      <span className={AI_LAB_LABEL}>{title}</span>
    </div>
    <div className="text-sm text-foreground space-y-1">{children}</div>
  </div>
);

export const CollapsibleDetails = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <details className={AI_LAB_COLLAPSIBLE}>
    <summary className="cursor-pointer font-medium text-foreground">{title}</summary>
    <div className="mt-2 space-y-1">{children}</div>
  </details>
);

export const Disclaimer = ({ text }: { text: string }) => (
  <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1">
    <Info className="h-3 w-3 shrink-0" />
    {text}
  </p>
);

export const KV = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-3 py-3 border-b border-border/60 last:border-0">
    <span className="text-xs text-muted-foreground">{k}</span>
    <span className={`text-sm font-semibold ${AI_LAB_METRIC}`}>{v}</span>
  </div>
);

export const BreakdownTable = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto -mx-1 px-1">
    <table className="w-full min-w-[480px] text-sm tabular-nums">{children}</table>
  </div>
);

export const TableHeadRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">{children}</tr>
);

export const TableHeadCell = ({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) => (
  <th
    className={`font-semibold py-2 ${align === "right" ? "text-right px-2" : "text-left pr-3"}`}
  >
    {children}
  </th>
);

export const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-t border-border/60">{children}</tr>
);

export const TableCell = ({
  children,
  align = "left",
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
  colSpan?: number;
}) => (
  <td
    colSpan={colSpan}
    className={`py-3 text-sm ${align === "right" ? "text-right px-2" : "text-left pr-3 text-muted-foreground"} ${className}`}
  >
    {children}
  </td>
);

export const fmtGainLoss = (n: number) => {
  const cls = signedColorClass(n);
  return <span className={cls}>{`${n >= 0 ? "+" : ""}${fmtKES(n)}`}</span>;
};

export const fmtPctColored = (n: number | null) => {
  if (n == null) return "—";
  const cls = signedColorClass(n);
  return (
    <span className={`font-semibold ${cls}`}>{`${n > 0 ? "+" : ""}${n.toFixed(2)}%`}</span>
  );
};
