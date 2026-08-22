import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  initAnalytics,
  captureUtmAttribution,
  trackEvent,
} from "@/lib/analytics";
import { initMetaPixel } from "@/lib/metaPixel";

const SESSION_LANDED_KEY = "kff_session_landed";

export const AnalyticsTracker = () => {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  // Initialize PostHog and Meta Pixel with consent gates, and capture initial landing attribution
  useEffect(() => {
    initAnalytics();
    initMetaPixel();

    if (typeof window !== "undefined") {
      const search = window.location.search;
      const referrer = document.referrer || "";
      const pathname = window.location.pathname;

      captureUtmAttribution(search, referrer, pathname);

      // Track site_landed once per browser session
      try {
        if (!sessionStorage.getItem(SESSION_LANDED_KEY)) {
          sessionStorage.setItem(SESSION_LANDED_KEY, "1");
          trackEvent("site_landed", {
            landing_path: pathname,
            raw_referrer: referrer || "direct",
          });
        }
      } catch {
        trackEvent("site_landed", {
          landing_path: pathname,
          raw_referrer: referrer || "direct",
        });
      }
    }
  }, []);

  // Track page views and specific entity views on route transitions
  useEffect(() => {
    const path = location.pathname;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;

    if (path === "/" || path === "/overview") {
      trackEvent("market_page_viewed", { section: "overview" });
    } else if (path === "/funds") {
      trackEvent("market_page_viewed", { section: "funds" });
    } else if (path === "/stocks") {
      trackEvent("market_page_viewed", { section: "stocks" });
    } else if (path.startsWith("/stocks/")) {
      const symbol = path.replace("/stocks/", "").split("/")[0];
      if (symbol && symbol !== "demo" && symbol !== "demo-2") {
        trackEvent("stock_viewed", { stock_symbol: symbol.toUpperCase() });
      }
    } else if (path === "/compare") {
      trackEvent("market_page_viewed", { section: "compare" });
    } else if (path.startsWith("/compare/")) {
      const fundSlug = path.replace("/compare/", "").split("/")[0];
      if (fundSlug) {
        trackEvent("fund_viewed", { fund_slug: fundSlug });
      }
    } else if (path === "/rates") {
      trackEvent("fx_viewed", { section: "exchange_rates" });
    } else if (path === "/commodities") {
      trackEvent("market_page_viewed", { section: "commodities" });
    } else if (path === "/treasury" || path === "/tbills" || path === "/bonds") {
      trackEvent("treasury_viewed", { section: "treasury" });
    } else if (path.startsWith("/news/")) {
      const newsId = path.replace("/news/", "").split("/")[0];
      if (newsId && newsId !== "archive") {
        trackEvent("news_article_viewed", { article_id: newsId });
      } else if (newsId === "archive") {
        trackEvent("market_page_viewed", { section: "news_archive" });
      }
    } else if (path === "/news") {
      trackEvent("market_page_viewed", { section: "news" });
    } else if (path === "/portfolio") {
      trackEvent("market_page_viewed", { section: "portfolio" });
    } else if (path === "/watchlist") {
      trackEvent("market_page_viewed", { section: "watchlist" });
    } else if (path === "/alerts") {
      trackEvent("market_page_viewed", { section: "alerts" });
    } else if (path === "/auth") {
      trackEvent("signup_started", { entrypoint: "auth_page" });
    }
  }, [location.pathname]);

  return null;
};

export default AnalyticsTracker;
