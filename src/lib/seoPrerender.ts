export const SEO_SITE_URL = "https://kenyafundfinder.com";
export const SEO_DEFAULT_OG_IMAGE = SEO_SITE_URL + "/og-image-1200x630.png";

export interface SeoPageDefinition {
  path: string;
  title: string;
  description: string;
  heading: string;
  contentHtml: string;
  image?: string | null;
  type?: "website" | "article";
  robots?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function stripHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateDescription(value: unknown, maxLength = 158): string {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 100 ? lastSpace : clipped.length).trim()}…`;
}

export function buildFundSeoTitle(name: string, slug: string, maxLength = 60): string {
  const cleanName = stripHtml(name).replace(/\s+/g, " ").trim();
  const nameTokens = new Set(
    cleanName.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean),
  );
  const tokenLabel = (token: string): string => {
    if (token === "sh" || token === "kes") return "KES";
    if (["usd", "gbp", "eur", "mmf"].includes(token)) return token.toUpperCase();
    return token.charAt(0).toUpperCase() + token.slice(1);
  };
  const variantTokens = slug
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !nameTokens.has(token))
    .map(tokenLabel)
    .filter((token, index, tokens) => token !== tokens[index - 1]);
  const variant = variantTokens.join(" ");
  const suffix = " – Yield & Fees";
  const maxIdentityLength = Math.max(12, maxLength - suffix.length);
  let identity = [cleanName, variant].filter(Boolean).join(" ");

  if (identity.length > maxIdentityLength) {
    const availableNameLength = Math.max(8, maxIdentityLength - (variant ? variant.length + 1 : 0));
    const clipped = cleanName.slice(0, availableNameLength);
    const boundary = clipped.lastIndexOf(" ");
    const shortName = clipped.slice(0, boundary > 8 ? boundary : clipped.length).trim();
    identity = [shortName, variant].filter(Boolean).join(" ").slice(0, maxIdentityLength).trim();
  }

  return identity + suffix;
}

export function canonicalUrl(path: string): string {
  const normalized = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  return `${SEO_SITE_URL}${normalized}`;
}

function replaceOrInsertHeadTag(html: string, pattern: RegExp, tag: string): string {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
}

function safeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function renderSeoHtml(template: string, page: SeoPageDefinition): string {
  template = template
    .replace(/<main\s+id=["']seo-prerender["'][\s\S]*?<\/main>/gi, "")
    .replace(/<script\s+type=["']application\/ld\+json["']\s+data-seo-prerender=["']true["']>[\s\S]*?<\/script>/gi, "")
    .replace(/<link\s+rel=["']alternate["']\s+hreflang=["'](?:en-KE|x-default)["'][^>]*>\s*/gi, "");
  const canonical = canonicalUrl(page.path);
  const title = escapeHtml(truncateDescription(page.title, 65));
  const description = escapeHtml(truncateDescription(page.description));
  const usesDefaultImage = !page.image || page.image === SEO_DEFAULT_OG_IMAGE;
  const image = escapeHtml(page.image || SEO_DEFAULT_OG_IMAGE);
  const imageAlt = escapeHtml(`${page.heading} — Kenya Fund Finder`);
  const robots = escapeHtml(page.robots || "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1");

  let html = template.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${robots}" />`);
  html = replaceOrInsertHeadTag(html, /<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${title}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${description}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${canonical}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="${page.type || "website"}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${image}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image:alt["'][^>]*>/i, `<meta property="og:image:alt" content="${imageAlt}" />`);
  if (usesDefaultImage) {
    html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image:type["'][^>]*>/i, `<meta property="og:image:type" content="image/png" />`);
    html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image:width["'][^>]*>/i, `<meta property="og:image:width" content="1200" />`);
    html = replaceOrInsertHeadTag(html, /<meta\s+property=["']og:image:height["'][^>]*>/i, `<meta property="og:image:height" content="630" />`);
  } else {
    html = html.replace(/<meta\s+property=["']og:image:(?:type|width|height)["'][^>]*>\s*/gi, "");
  }
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${title}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${description}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${image}" />`);
  html = replaceOrInsertHeadTag(html, /<meta\s+name=["']twitter:image:alt["'][^>]*>/i, `<meta name="twitter:image:alt" content="${imageAlt}" />`);

  const alternates = [
    `<link rel="alternate" hreflang="en-KE" href="${canonical}" />`,
    `<link rel="alternate" hreflang="x-default" href="${canonical}" />`,
  ].join("\n  ");
  html = html.replace("</head>", `  ${alternates}\n</head>`);

  const schemas = page.jsonLd ? (Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd]) : [];
  if (schemas.length) {
    const scripts = schemas
      .map((schema) => `<script type="application/ld+json" data-seo-prerender="true">${safeJsonLd(schema)}</script>`)
      .join("\n  ");
    html = html.replace("</head>", `  ${scripts}\n</head>`);
  }

  const prerender = [
    `<main id="seo-prerender" style="max-width:900px;margin:0 auto;padding:48px 24px;color:#e6edf7;background:#050607;font-family:Inter,system-ui,sans-serif;line-height:1.65">`,
    `<a href="/" style="color:#22c55e;text-decoration:none;font-weight:700">Kenya Fund Finder</a>`,
    `<h1 style="margin:24px 0 16px;font-family:'DM Sans',system-ui,sans-serif;font-size:32px;line-height:1.2">${escapeHtml(page.heading)}</h1>`,
    page.contentHtml,
    `</main>`,
  ].join("");

  html = html.replace('<div id="root">', `<div id="root">${prerender}`);
  html = html.replace('id="kff-boot-fallback" style="', 'id="kff-boot-fallback" aria-hidden="true" style="display:none!important;');
  return html;
}

export function paragraph(text: unknown): string {
  const cleaned = stripHtml(text);
  return cleaned ? `<p>${escapeHtml(cleaned)}</p>` : "";
}

export function definitionList(items: Array<[string, unknown]>): string {
  const rows = items
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => `<div><dt style="font-weight:700">${escapeHtml(label)}</dt><dd style="margin:0 0 12px">${escapeHtml(value)}</dd></div>`)
    .join("");
  return rows ? `<dl>${rows}</dl>` : "";
}
