const LOGO_BASE = "https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/market-logos/fund-managers";
const COOP_STOCK_LOGO = "https://caawgzuofnujrznwbuxk.supabase.co/storage/v1/object/public/market-logos/stocks/COOP-provided-v3.webp";

const FUND_MANAGER_LOGOS: Record<string, string> = {
  "african alliance": "african-alliance-provided-v4.webp",
  "icea lion asset management ltd": "icea.webp",
  "icea lion asset management": "icea.webp",
  "african alliance kenya asset management": "african-alliance-provided-v4.webp",
  "arvocap asset managers limited": "arvocap-provided-v2.webp",
  "britam asset managers": "britam.webp",
  "britam asset managers (kenya) limited": "britam.webp",
  "britam asset managers kenya limited": "britam.webp",
  "cic asset management": "cic.webp",
  "cic asset management ltd": "cic.webp",
  "cic global balanced": "cic.webp",
  // The fund manager is part of Co-op Bank, so it intentionally uses the
  // exact reviewed COOP stock artwork rather than the older manager asset.
  "co-op trust investment services limited": COOP_STOCK_LOGO,
  "apollo asset management company ltd": "apollo-provided-v3.webp",
  "cpf financial services": "cpf-provided-v3.webp",
  "cpf asset managers": "cpf-provided-v3.webp",
  "cytonn asset managers limited": "cytonn-provided-v2.webp",
  "etica capital ltd": "etica-provided-v2.webp",
  "etica shariah": "etica-provided-v2.webp",
  "equity investment bank": "equity-provided.webp",
  "dry associates investment bank": "dry-associates-provided-v3.webp",
  "genghis capital limited": "genghis-provided-v3.webp",
  "gulfcap investment bank": "gulfcap-provided-v3.webp",
  "gulfcap investment bank (gcib)": "gulfcap-provided-v3.webp",
  "jubilee asset management": "jubilee.webp",
  "ubilee asset management limited": "jubilee.webp",
  "kcb asset management ltd": "kcb.webp",
  "kuza asset management limited": "kuza-provided-v3.webp",
  "kuza momentum": "kuza-provided-v3.webp",
  "lofty-corban investments limited": "lofty-corban-provided-v2.webp",
  "lofty corban asset managers ltd": "lofty-corban-provided-v2.webp",
  "lofty_corban private debt": "lofty-corban-provided-v2.webp",
  "madison investment managers limited": "madison-provided-v2.webp",
  "nabo capital": "nabo-provided-v2.webp",
  "nabo capital limited": "nabo-provided-v2.webp",
  "ncba investment bank": "ncba-provided-v4.webp",
  "old mutual investment group": "old-mutual.webp",
  "orient asset managers limited": "orient.webp",
  "sanlam allianz investments limited": "sanlam-provided-v3.webp",
  "sanlamallianz": "sanlam-provided-v3.webp",
  "stanbic investment management services": "stanbic.webp",
  "stanbic": "stanbic.webp",
};

const normalizeManager = (manager?: string | null) => manager?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";

/**
 * Resolves a fund manager to the shared approved brand image. A recognised
 * manager takes precedence over an inconsistent per-row value; unlisted
 * managers retain their stored image or intentionally fall back to initials.
 */
export function getFundManagerLogoUrl(manager?: string | null, storedLogoUrl?: string | null) {
  const asset = FUND_MANAGER_LOGOS[normalizeManager(manager)];
  return asset ? (asset.startsWith("http") ? asset : `${LOGO_BASE}/${asset}`) : storedLogoUrl?.trim() || undefined;
}
