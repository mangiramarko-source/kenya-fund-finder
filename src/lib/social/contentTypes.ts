export interface ContentTypeDef {
  key: string;
  name: string;
  description: string;
  needsFunds: boolean;
  defaultCurrency?: "KES" | "USD" | "%";
}

export const CONTENT_TYPES: ContentTypeDef[] = [
  { key: "daily_mmf_update", name: "Daily MMF Yield Update", description: "Top 3 KES + top 3 USD MMF yields", needsFunds: true },
  { key: "top_kes_mmf", name: "Top KES MMF Yields", description: "Top KES money market funds", needsFunds: true, defaultCurrency: "KES" },
  { key: "top_usd_mmf", name: "Top USD MMF Yields", description: "Top USD money market funds", needsFunds: true, defaultCurrency: "USD" },
  { key: "weekly_summary", name: "Weekly Fund Summary", description: "Weekly roundup of Kenyan funds", needsFunds: true },
  { key: "fund_comparison", name: "Fund Comparison", description: "Side-by-side comparison of two funds", needsFunds: true },
  { key: "fund_spotlight", name: "Single Fund Spotlight", description: "Highlight one fund's details", needsFunds: true },
  { key: "edu_what_is_mmf", name: "What is a Money Market Fund?", description: "Education post", needsFunds: false },
  { key: "edu_effective_yield", name: "How Effective Annual Yield Works", description: "Education post", needsFunds: false },
  { key: "edu_how_to_compare", name: "How to Compare Funds", description: "Education post", needsFunds: false },
  { key: "calculator_promo", name: "Calculator Promotion", description: "Promote the investment calculator", needsFunds: false },
  { key: "diaspora_edu", name: "Diaspora Investing Education", description: "Education for Kenyans abroad", needsFunds: false },
  { key: "new_fund_added", name: "New Fund Added", description: "Announce a new fund added to the site", needsFunds: true },
  { key: "website_feature", name: "Website Feature Post", description: "Highlight a KenyaFundFinder feature", needsFunds: false },
  { key: "finance_tip", name: "Personal Finance Tip", description: "General personal finance tip for Kenyans", needsFunds: false },
];

export const PLATFORMS = ["instagram", "facebook", "x"] as const;
export type Platform = typeof PLATFORMS[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X / Twitter",
};

export const PLATFORM_IMAGE_SIZE: Record<Platform, string> = {
  instagram: "1080x1080",
  facebook: "1200x630",
  x: "1200x675",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  failed: "Failed",
  manually_posted: "Manually Posted",
  cancelled: "Cancelled",
};
