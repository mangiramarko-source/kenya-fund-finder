import { isMarketNewsBriefResult, type MarketNewsBriefResult } from "./market-news-brief.ts";

export type DailyMarketSummaryKind = "stocks" | "mmf" | "fx" | "commodities";

export interface DailyMarketSummaryMetric {
  label: string;
  value: string;
  detail?: string;
  trend?: "positive" | "negative" | "neutral";
}

export interface DailyMarketSummarySection {
  kind: DailyMarketSummaryKind;
  title: string;
  summary: string;
  metrics: DailyMarketSummaryMetric[];
  highlights: string[];
  unavailable: boolean;
}

export interface DailyMarketSummaryResult {
  kind: "daily-market-summary";
  title: string;
  sections: DailyMarketSummarySection[];
  newsBrief?: MarketNewsBriefResult;
  disclaimer: string;
}

function text(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

export function isDailyMarketSummaryResult(value: unknown): value is DailyMarketSummaryResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.kind !== "daily-market-summary" || !text(result.title, 120) || !text(result.disclaimer, 240) || !Array.isArray(result.sections) || result.sections.length < 1 || result.sections.length > 4) return false;
  const kinds = new Set<string>();
  const validSections = result.sections.every((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const section = value as Record<string, unknown>;
    if (!(["stocks", "mmf", "fx", "commodities"] as string[]).includes(String(section.kind)) || kinds.has(String(section.kind))) return false;
    kinds.add(String(section.kind));
    if (!text(section.title, 100) || !text(section.summary, 1_500) || typeof section.unavailable !== "boolean" || !Array.isArray(section.metrics) || section.metrics.length > 4 || !Array.isArray(section.highlights) || section.highlights.length > 3) return false;
    return section.metrics.every((metric) => {
      if (!metric || typeof metric !== "object" || Array.isArray(metric)) return false;
      const item = metric as Record<string, unknown>;
      return text(item.label, 80) && text(item.value, 120)
        && (item.detail == null || text(item.detail, 160))
        && (item.trend == null || ["positive", "negative", "neutral"].includes(String(item.trend)));
    }) && section.highlights.every((highlight) => text(highlight, 400));
  });
  return validSections && (result.newsBrief == null || isMarketNewsBriefResult(result.newsBrief));
}
