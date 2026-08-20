const INDEXABLE_CMS_SLUGS = new Set(["about", "contact"]);

/**
 * CMS rows also store operational copy such as the footer disclaimer and live
 * status text. Only deliberate, user-facing CMS pages belong in search.
 */
export function isIndexableSitePageSlug(slug: string | null | undefined): slug is string {
  return Boolean(slug && INDEXABLE_CMS_SLUGS.has(slug));
}

