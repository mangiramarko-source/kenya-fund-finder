/** News image resolution and optimization utilities.
 *  Preserves genuine publisher editorial images and safely returns null
 *  for articles that do not come with an image. */

/** Rewrite known CDN URLs to request right-sized variants for card thumbnails.
 *  Saves significant bandwidth vs. serving full-resolution editorial images.
 *  `large=true` requests a hero-sized variant for the first/featured card. */
export function optimizeImageUrl(url: string, large = false): string {
  // Use higher resolutions for retina displays: 560px for thumbnail, 1040px for hero
  const w = large ? 1040 : 560;
  const h = large ? 650 : 350;
  try {
    // Unsplash: enforce reasonable size + quality params.
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("w", String(w));
      u.searchParams.set("h", String(h));
      u.searchParams.set("fit", "crop");
      u.searchParams.set("auto", "format");
      u.searchParams.set("q", large ? "85" : "75");
      return u.toString();
    }
    // Tuko CDN delivers /images/{w}x{h}/file.jpg — rewrite to a smaller variant.
    if (url.includes("cdn.tuko.co.ke/images/")) {
      return url.replace(/\/images\/\d+x\d+\//, `/images/${w}x${h}/`);
    }
    // Picsum direct URLs.
    if (url.includes("picsum.photos/seed/")) {
      return url.replace(/\/(\d+)\/(\d+)(?=$|\?)/, `/${w}/${h}`);
    }
  } catch {
    // Fall through and return original on parse errors.
  }
  return url;
}

/**
 * Returns the optimized genuine image URL if the article comes with one,
 * or null if the article has no image.
 */
export function getNewsImage(
  imageUrl?: string | null,
  _category?: string,
  _id?: string,
  large = false,
  _source?: string | null,
): string | null {
  if (imageUrl && typeof imageUrl === "string" && imageUrl.trim().length > 0) {
    return optimizeImageUrl(imageUrl.trim(), large);
  }
  return null;
}

/**
 * Error handler for genuine images that fail to load (404, CORS, or broken link).
 * Gracefully hides the image element/container without injecting placeholder stock photos.
 */
export function handleNewsImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  _category?: string,
  _id?: string
) {
  const img = e.currentTarget;
  if (img.parentElement) {
    img.parentElement.style.display = "none";
  } else {
    img.style.display = "none";
  }
}
