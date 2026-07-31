/** Placeholder images by category when no image_url is set.
 *  Uses LoremFlickr to generate infinite, deterministic, contextual 
 *  images based on the article category and ID. */

/** Strong 32-bit hash so different ids map to different deterministic seeds. */
function hashId(id: string): number {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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
  const seed = hashId(id || "kenya-fund-finder");
  
  const basePrompt = category === "International" 
    ? "Cinematic photography of global economy and international financial markets" 
    : `Cinematic photography representing ${category.toLowerCase()} in Kenyan business and finance`;
    
  const prompt = encodeURIComponent(`${basePrompt}, highly detailed, professional corporate style`);
  
  return `https://image.pollinations.ai/prompt/${prompt}?seed=${seed}&width=${w}&height=${h}&nologo=true`;
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

