export type SourceTier = "official" | "financial_press" | "press" | "internal";

export interface SourceAttributionInfo {
  sourceName: string;
  sourceDomain: string | null;
  tier: SourceTier;
  badgeLabel: string;
  badgeClass: string;
  attributionLine: string;
  isOfficial: boolean;
}

export function parseSourceAttribution(
  rawSource?: string | null,
  rawUrl?: string | null,
  category?: string | null,
): SourceAttributionInfo {
  const source = (rawSource || "").trim();
  const lower = source.toLowerCase();

  let domain: string | null = null;
  if (rawUrl) {
    try {
      domain = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`).hostname.replace(
        /^www\./,
        "",
      );
    } catch {
      domain = null;
    }
  }

  // Tier 1: Official Regulatory & Exchange Disclosures
  if (
    lower.includes("nse") ||
    lower.includes("nairobi securities exchange") ||
    lower.includes("exchange disclosure")
  ) {
    return {
      sourceName: "Nairobi Securities Exchange",
      sourceDomain: domain || "nse.co.ke",
      tier: "official",
      badgeLabel: "Official Filing",
      badgeClass:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      attributionLine: "NSE Official Corporate Filing",
      isOfficial: true,
    };
  }

  if (lower.includes("cbk") || lower.includes("central bank")) {
    return {
      sourceName: "Central Bank of Kenya",
      sourceDomain: domain || "centralbank.go.ke",
      tier: "official",
      badgeLabel: "Central Bank Bulletin",
      badgeClass:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      attributionLine: "Central Bank of Kenya (CBK) Release",
      isOfficial: true,
    };
  }

  if (lower.includes("cma") || lower.includes("capital markets authority")) {
    return {
      sourceName: "Capital Markets Authority",
      sourceDomain: domain || "cma.or.ke",
      tier: "official",
      badgeLabel: "Regulatory Disclosure",
      badgeClass:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      attributionLine: "CMA Regulatory Bulletin",
      isOfficial: true,
    };
  }

  // Tier 2: Dedicated Financial Press
  if (lower.includes("business daily")) {
    return {
      sourceName: "Business Daily",
      sourceDomain: domain || "businessdailyafrica.com",
      tier: "financial_press",
      badgeLabel: "Financial Press",
      badgeClass:
        "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
      attributionLine: "Reported by Business Daily",
      isOfficial: false,
    };
  }

  if (lower.includes("bloomberg") || lower.includes("reuters") || lower.includes("cnbc")) {
    const clean = lower.includes("bloomberg")
      ? "Bloomberg"
      : lower.includes("reuters")
      ? "Reuters"
      : "CNBC";
    return {
      sourceName: clean,
      sourceDomain: domain,
      tier: "financial_press",
      badgeLabel: "Financial Wire",
      badgeClass:
        "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
      attributionLine: `Reported by ${clean}`,
      isOfficial: false,
    };
  }

  if (lower.includes("techcabal")) {
    return {
      sourceName: "TechCabal",
      sourceDomain: domain || "techcabal.com",
      tier: "financial_press",
      badgeLabel: "Tech & Markets",
      badgeClass:
        "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/25",
      attributionLine: "Reported by TechCabal",
      isOfficial: false,
    };
  }

  // Tier 3: General Media & News Outlets
  const cleanName =
    lower.includes("tuko")
      ? "Tuko News"
      : lower.includes("capital fm")
      ? "Capital FM"
      : lower.includes("standard")
      ? "The Standard"
      : lower.includes("nation")
      ? "Daily Nation"
      : source || "Market Wire";

  return {
    sourceName: cleanName,
    sourceDomain: domain,
    tier: "press",
    badgeLabel: category ? `${category} Press` : "Press Coverage",
    badgeClass: "bg-muted text-muted-foreground border-border/70",
    attributionLine: `Reported by ${cleanName}`,
    isOfficial: false,
  };
}
