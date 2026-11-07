/**
 * Kenya Capital Markets Authority (CMA) & Legal Compliance Safeguards
 * Provides standardized financial disclosures, category metadata, and disclaimers
 * to ensure communications comply with Kenya's Capital Markets Act and ODPC 2019.
 */

export type PostCategory = "market_update" | "educational" | "opinion" | "platform_announcement";
export type DisclaimerType = "cma_standard" | "educational" | "opinion" | "none";
export type PostType = "story" | "feed" | "both";

export interface CategoryMetadata {
  key: PostCategory;
  label: string;
  badgeLabel: string;
  description: string;
  defaultDisclaimer: DisclaimerType;
  badgeVariant: "default" | "secondary" | "outline";
}

export const POST_CATEGORIES: Record<PostCategory, CategoryMetadata> = {
  market_update: {
    key: "market_update",
    label: "Market Update",
    badgeLabel: "Market Update",
    description: "Factual reporting on MMF yields, NSE stock movements, CBK treasury bills, and macro data.",
    defaultDisclaimer: "cma_standard",
    badgeVariant: "default",
  },
  educational: {
    key: "educational",
    label: "Financial Education",
    badgeLabel: "Education",
    description: "General investing knowledge, compound interest guides, and savings concepts.",
    defaultDisclaimer: "educational",
    badgeVariant: "secondary",
  },
  opinion: {
    key: "opinion",
    label: "Market Opinion & Commentary",
    badgeLabel: "Analysis / Opinion",
    description: "Personal founder or analyst observations, commentary, and macro perspectives.",
    defaultDisclaimer: "opinion",
    badgeVariant: "outline",
  },
  platform_announcement: {
    key: "platform_announcement",
    label: "Platform Announcement",
    badgeLabel: "Update",
    description: "Product releases, feature additions, or service maintenance notices.",
    defaultDisclaimer: "none",
    badgeVariant: "outline",
  },
};

export const CMA_DISCLAIMERS: Record<DisclaimerType, string> = {
  cma_standard:
    "Disclaimer: For informational and educational purposes only. Past performance does not guarantee future results. KenyaFundFinder is not a licensed investment advisor or broker-dealer under the Capital Markets Act (Cap 485A). Nothing herein constitutes personalized investment, tax, or legal advice.",
  educational:
    "Disclaimer: Educational content only. Illustrative figures and examples do not constitute financial advice. Always verify rates independently with licensed fund managers or consult a CMA-certified investment professional before investing.",
  opinion:
    "Disclaimer: Market commentary and personal observations reflect author perspectives at the time of publication and do not constitute financial advice, solicitation, or a recommendation to buy or sell securities.",
  none: "",
};

export function getDisclaimerText(type: DisclaimerType): string {
  return CMA_DISCLAIMERS[type] || "";
}

export function getDefaultDisclaimerForCategory(category: PostCategory): DisclaimerType {
  return POST_CATEGORIES[category]?.defaultDisclaimer || "cma_standard";
}

export function getCategoryBadge(category: PostCategory) {
  return POST_CATEGORIES[category] || POST_CATEGORIES.market_update;
}
