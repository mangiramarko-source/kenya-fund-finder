import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const INDEXABLE_PATHS = [
  /^\/$/,
  /^\/funds\/?$/,
  /^\/compare\/?$/,
  /^\/compare\/[A-Za-z0-9_-]+\/?$/,
  /^\/news\/?$/,
  /^\/news\/[A-Za-z0-9_-]+\/?$/,
  /^\/learn\/?$/,
  /^\/learn\/how-to-invest-in-money-market-funds-kenya\/?$/,
  /^\/(privacy|terms|checklist|rates|commodities|stocks|markets|calculator)\/?$/,
  /^\/stocks\/[A-Za-z0-9_-]+\/?$/,
  /^\/page\/[A-Za-z0-9_-]+\/?$/,
];

const NON_INDEXABLE_DEMO_PATHS = [
  /^\/stocks\/demo-2\/?$/,
];

export default function SeoRoutePolicy() {
  const { pathname } = useLocation();

  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    const indexable = !NON_INDEXABLE_DEMO_PATHS.some((pattern) => pattern.test(pathname))
      && INDEXABLE_PATHS.some((pattern) => pattern.test(pathname));
    meta.content = indexable
      ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      : "noindex, nofollow, noarchive";
  }, [pathname]);

  return null;
}
