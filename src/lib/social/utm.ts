import type { Platform } from "./contentTypes";

const PLATFORM_SOURCE: Record<Platform, string> = {
  instagram: "instagram",
  facebook: "facebook",
  x: "x",
};

export function buildUtmUrl(platform: Platform, campaign: string, base = "https://kenyafundfinder.com"): string {
  const url = new URL(base);
  url.searchParams.set("utm_source", PLATFORM_SOURCE[platform]);
  url.searchParams.set("utm_medium", "social");
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}
