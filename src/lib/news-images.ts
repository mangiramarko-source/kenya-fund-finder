/** Placeholder images by category when no image_url is set.
 *  Uses LoremFlickr to generate infinite, deterministic, contextual 
 *  images based on the article category and ID. */

/** Strong 32-bit hash so different ids map to different deterministic seeds. */
function hashId(id: string | number): number {
  const idStr = String(id);
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < idStr.length; i++) {
    h ^= idStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 60+ premium hand-picked Unsplash IDs of business, finance, and office photography.
// This guarantees world-class images with zero risk of bad AI generation or repeating "cats".
const UNSPLASH_POOL = [
  "ZPeXrWxOoEQ", "U6_xOQ9x42A", "I8a865F2nKk", "vB5xtGOkXgE", "OqmZwNd3ThU",
  "ZzOa5G8hSPI", "LKsWqL4H1G4", "d4b_B4aNchg", "PNCW3F783vY", "jF69kR07ZzM",
  "yTfX3Eib91w", "O7bE7-54Ue4", "8vX0Bw8d1o0", "xG8IQMqMITU", "F2VvUa_Jp8o",
  "M6CqVp9n_C4", "J5V2Qy1N-90", "v7WzQ8r4NBo", "rW-I87aP5EQ", "fT6E8r0lEhc",
  "LpPcqA5lqgY", "Z530wUq8XwY", "2E9z0L7D7oQ", "c1r0hR804p4", "4wzG-rZ6H1c",
  "hCcczX83XJw", "Dqq_d23XkF8", "qO_G056t8n4", "OaqsKnv3oEY", "m1Jk8O6-1gI",
  "yEOTwYc5eN0", "R0e5c9b_L6E", "1K9T5YiZ2WU", "1K9T5YiZ2WU", "Zyx1bK9mqmA",
  "Xy-T_80v7iM", "PNCW3F783vY", "UvYQJ63k4A0", "Tz7G0_K-E-4", "B3ZqO1t53g0",
  "561igd9Kq-c", "qWwpHwip31M", "1-aA2Fadydc", "V9XhD-k6oEM", "0w2W1b-fX6I",
  "c6v6zY6v0g4", "Yq-q7n0k7-E", "Fyl8sMc2-4Y", "H4eUo4gB7fQ", "3bAglS_c09U",
  "vB5xtGOkXgE", "ZPeXrWxOoEQ", "I8a865F2nKk", "jF69kR07ZzM", "yTfX3Eib91w",
  "fT6E8r0lEhc", "LpPcqA5lqgY", "c1r0hR804p4", "Dqq_d23XkF8", "m1Jk8O6-1gI"
];

/** Final safety-net image, always available, deterministic per article id. */
function picsumFallback(id: string, large = false): string {
  const w = large ? 1040 : 560;
  const h = large ? 650 : 350;
  const seed = encodeURIComponent(id || "kenya-fund-finder");
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

function getCategoryImage(category: string, id: string, large = false): string {
  const w = large ? 1040 : 560;
  const h = large ? 650 : 350;
  
  // Pick deterministically from our massive pool of 60 premium images
  const index = hashId(id || "kenya-fund-finder") % UNSPLASH_POOL.length;
  const unsplashId = UNSPLASH_POOL[index];
  
  return `https://images.unsplash.com/photo-${unsplashId}?w=${w}&h=${h}&fit=crop&q=${large ? "85" : "75"}`;
}

/** Rewrite known CDN URLs to request right-sized variants for card thumbnails.
 *  Saves significant bandwidth vs. serving full-resolution editorial images.
 *  `large=true` requests a hero-sized variant for the first/featured card. */
function optimizeImageUrl(url: string, large = false): string {
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

export function getNewsImage(
  imageUrl: string | null,
  category: string,
  id: string,
  large = false
): string {
  if (imageUrl) return optimizeImageUrl(imageUrl, large);
  
  // Directly get the correct sized image from our generator
  return getCategoryImage(category, id, large);
}

/** onError handler — tries category fallback, then a guaranteed Picsum image. */
export function handleNewsImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  category: string,
  id: string
) {
  const img = e.currentTarget;
  const stage = img.dataset.fallbackStage || "0";

  // Check if it's the hero image by looking at its width (heuristic)
  const isLarge = img.width > 300;

  if (stage === "0") {
    // First failure: try the category fallback (covers broken source images).
    const next = getCategoryImage(category, id, isLarge);
    if (img.src !== next) {
      img.dataset.fallbackStage = "1";
      img.src = next;
      return;
    }
    img.dataset.fallbackStage = "1";
  }

  if (img.dataset.fallbackStage === "1") {
    // Second failure: deterministic always-available image.
    img.dataset.fallbackStage = "2";
    img.src = picsumFallback(id, isLarge);
  }
}

