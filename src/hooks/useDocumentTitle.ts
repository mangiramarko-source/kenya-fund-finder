import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://kenyafundfinder.com";

export function useDocumentTitle(title: string, description?: string) {
  const { pathname } = useLocation();

  useEffect(() => {
    const prev = document.title;
    document.title = title;

    // Canonical tag
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    const prevCanonical = canonical.getAttribute("href") || "";
    canonical.setAttribute("href", `${SITE_URL}${pathname}`);

    // Meta description
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.getAttribute("content") || "";
    if (description && meta) {
      meta.setAttribute("content", description);
    }

    return () => {
      document.title = prev;
      if (meta) meta.setAttribute("content", prevDesc);
      if (canonical) canonical.setAttribute("href", prevCanonical);
    };
  }, [title, description, pathname]);
}

export function useJsonLd(data: Record<string, unknown> | null) {
  useEffect(() => {
    if (!data) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(data);
    script.setAttribute("data-jsonld", "true");
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [JSON.stringify(data)]);
}
