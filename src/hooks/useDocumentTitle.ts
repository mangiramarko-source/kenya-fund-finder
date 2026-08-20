import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SEO_DEFAULT_OG_IMAGE } from "@/lib/seoPrerender";

const SITE_URL = "https://kenyafundfinder.com";

interface OgMeta {
  title: string;
  description: string;
  image?: string;
  type?: string;
}

export function useDocumentTitle(title: string, description?: string, og?: OgMeta) {
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
    const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    const prevDesc = meta?.getAttribute("content") || "";
    if (description && meta) {
      meta.setAttribute("content", description);
    }

    // OG meta tags
    const ogTags: HTMLMetaElement[] = [];
    if (og) {
      const setOg = (property: string, content: string) => {
        let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute("property", property);
          document.head.appendChild(el);
          ogTags.push(el);
        }
        el.setAttribute("content", content);
      };
      setOg("og:title", og.title);
      setOg("og:description", og.description);
      setOg("og:url", `${SITE_URL}${pathname}`);
      setOg("og:type", og.type || "website");
      const image = og.image || SEO_DEFAULT_OG_IMAGE;
      setOg("og:image", image);
      setOg("og:image:alt", og.title + " — Kenya Fund Finder");
      if (!og.image) {
        setOg("og:image:type", "image/png");
        setOg("og:image:width", "1200");
        setOg("og:image:height", "630");
      }

      // Twitter
      let twitterTitle = document.querySelector('meta[name="twitter:title"]') as HTMLMetaElement | null;
      if (!twitterTitle) {
        twitterTitle = document.createElement("meta");
        twitterTitle.setAttribute("name", "twitter:title");
        document.head.appendChild(twitterTitle);
        ogTags.push(twitterTitle);
      }
      twitterTitle.setAttribute("content", og.title);

      let twitterDesc = document.querySelector('meta[name="twitter:description"]') as HTMLMetaElement | null;
      if (!twitterDesc) {
        twitterDesc = document.createElement("meta");
        twitterDesc.setAttribute("name", "twitter:description");
        document.head.appendChild(twitterDesc);
        ogTags.push(twitterDesc);
      }
      twitterDesc.setAttribute("content", og.description);

      let twitterImage = document.querySelector('meta[name="twitter:image"]') as HTMLMetaElement | null;
      if (!twitterImage) {
        twitterImage = document.createElement("meta");
        twitterImage.setAttribute("name", "twitter:image");
        document.head.appendChild(twitterImage);
        ogTags.push(twitterImage);
      }
      twitterImage.setAttribute("content", image);

      let twitterImageAlt = document.querySelector('meta[name="twitter:image:alt"]') as HTMLMetaElement | null;
      if (!twitterImageAlt) {
        twitterImageAlt = document.createElement("meta");
        twitterImageAlt.setAttribute("name", "twitter:image:alt");
        document.head.appendChild(twitterImageAlt);
        ogTags.push(twitterImageAlt);
      }
      twitterImageAlt.setAttribute("content", og.title + " — Kenya Fund Finder");
    }

    return () => {
      document.title = prev;
      if (meta) meta.setAttribute("content", prevDesc);
      if (canonical) canonical.setAttribute("href", prevCanonical);
      ogTags.forEach((el) => el.remove());
    };
  }, [title, description, pathname, og?.title, og?.description, og?.image]);
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
