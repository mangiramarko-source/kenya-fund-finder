import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE = "https://kenyafundfinder.com";

const LABELS: Record<string, string> = {
  funds: "Unit Trusts",
  stocks: "Stocks",
  compare: "Compare",
  rates: "FX Rates",
  commodities: "Commodities",
  markets: "Markets",
  news: "News",
  overview: "Overview",
  calculator: "Calculator",
  alerts: "Alerts",
  learn: "Learn",
  checklist: "Checklist",
  watchlist: "Watchlist",
  portfolio: "Portfolio",
  profile: "Profile",
  privacy: "Privacy",
  terms: "Terms",
  page: "Page",
};

// Routes that already inject their own BreadcrumbList (more specific) — skip.
const SKIP_PREFIXES = ["/news/", "/compare/", "/stocks/"];

function prettify(seg: string) {
  return decodeURIComponent(seg).replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SeoBreadcrumbs = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/" || pathname === "/overview") return;
    if (SKIP_PREFIXES.some((p) => pathname.startsWith(p))) return;

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return;

    const items = [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      ...segments.map((seg, i) => {
        const path = "/" + segments.slice(0, i + 1).join("/");
        const name = LABELS[seg] || prettify(seg);
        return { "@type": "ListItem", position: i + 2, name, item: `${SITE}${path}` };
      }),
    ];

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-jsonld", "breadcrumbs");
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items,
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [pathname]);

  return null;
};

export default SeoBreadcrumbs;
