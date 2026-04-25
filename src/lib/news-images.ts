/** Placeholder images by category when no image_url is set.
 *  Each pool uses verified Unsplash photo IDs (HTTP 200) so different
 *  articles in the same category rarely collide on the same hero image.
 *  A deterministic Picsum URL is used as the final guaranteed fallback
 *  if Unsplash itself ever 404s. */
const UNSPLASH = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=520&h=325&fit=crop&auto=format&q=60`;

const categoryImages: Record<string, string[]> = {
  "Yield Updates": [
    UNSPLASH("1611974789855-9c2a0a7236a3"),
    UNSPLASH("1590283603385-17ffb3a7f29f"),
    UNSPLASH("1642790106117-e829e14a795f"),
    UNSPLASH("1543286386-713bdd548da4"),
    UNSPLASH("1620266757065-5814239881fd"),
    UNSPLASH("1579532537598-459ecdaf39cc"),
    UNSPLASH("1559526324-4b87b5e36e44"),
    UNSPLASH("1565514020179-026b92b84bb6"),
    UNSPLASH("1633158829585-23ba8f7c8caf"),
    UNSPLASH("1601597111158-2fceff292cdc"),
    UNSPLASH("1612010167108-3e6b327405f0"),
    UNSPLASH("1622547748225-3fc4abd2cca0"),
    UNSPLASH("1624996379697-f01d168b1a52"),
    UNSPLASH("1554260570-9140fd3b7614"),
    UNSPLASH("1554224155-8d04cb21cd6c"),
  ],
  "Market News": [
    UNSPLASH("1526304640581-d334cdbbf45e"),
    UNSPLASH("1468254095679-bbcba94a7066"),
    UNSPLASH("1604594849809-dfedbc827105"),
    UNSPLASH("1611974789855-9c2a0a7236a3"),
    UNSPLASH("1591696205602-2f950c417cb9"),
    UNSPLASH("1535320903710-d993d3d77d29"),
    UNSPLASH("1556761175-5973dc0f32e7"),
    UNSPLASH("1542744173-8e7e53415bb0"),
    UNSPLASH("1518186285589-2f7649de83e0"),
    UNSPLASH("1554224154-26032ffc0d07"),
    UNSPLASH("1591033594798-33227a05780d"),
    UNSPLASH("1560221328-12fe60f83ab8"),
    UNSPLASH("1567427017947-545c5f8d16ad"),
    UNSPLASH("1505373877841-8d25f7d46678"),
    UNSPLASH("1457694587812-e8bf29a43845"),
    UNSPLASH("1551288049-bebda4e38f71"),
    UNSPLASH("1620228885847-9eab2a1adddc"),
  ],
  "Regulatory Updates": [
    UNSPLASH("1589829545856-d10d557cf95f"),
    UNSPLASH("1450101499163-c8848c66ca85"),
    UNSPLASH("1507679799987-c73779587ccf"),
    UNSPLASH("1505664194779-8beaceb93744"),
    UNSPLASH("1521587760476-6c12a4b040da"),
    UNSPLASH("1604357209793-fca5dca89f97"),
    UNSPLASH("1589994965851-a8f479c573a9"),
    UNSPLASH("1521791136064-7986c2920216"),
    UNSPLASH("1505842465776-3d90f616310d"),
    UNSPLASH("1593115057322-e94b77572f20"),
    UNSPLASH("1614028674026-a65e31bfd27c"),
    UNSPLASH("1473093226795-af9932fe5856"),
    UNSPLASH("1450101499163-c8848c66ca85"),
    UNSPLASH("1589216532372-1c2a367900d9"),
    UNSPLASH("1589216532372-1c2a367900d9"),
  ],
  "Fund Announcements": [
    UNSPLASH("1554224155-6726b3ff858f"),
    UNSPLASH("1460925895917-afdab827c52f"),
    UNSPLASH("1551288049-bebda4e38f71"),
    UNSPLASH("1579621970795-87facc2f976d"),
    UNSPLASH("1551836022-d5d88e9218df"),
    UNSPLASH("1556761175-b413da4baf72"),
    UNSPLASH("1556742049-0cfed4f6a45d"),
    UNSPLASH("1573164713988-8665fc963095"),
    UNSPLASH("1600880292203-757bb62b4baf"),
    UNSPLASH("1556155092-490a1ba16284"),
    UNSPLASH("1517048676732-d65bc937f952"),
    UNSPLASH("1521737711867-e3b97375f902"),
    UNSPLASH("1542626991-cbc4e32524cc"),
    UNSPLASH("1606857521015-7f9fcf423740"),
    UNSPLASH("1573497019940-1c28c88b4f3e"),
    UNSPLASH("1454165804606-c3d57bc86b40"),
  ],
};

/** Strong 32-bit hash so different ids rarely collide on the same image. */
function hashId(id: string): number {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Final safety-net image, always available, deterministic per article id. */
function picsumFallback(id: string): string {
  // Use the article id as a stable seed so each article gets a unique image.
  const seed = encodeURIComponent(id || "kenya-fund-finder");
  return `https://picsum.photos/seed/${seed}/520/325`;
}

function getCategoryImage(category: string, id: string): string {
  const imgs = categoryImages[category] || categoryImages["Market News"]!;
  return imgs[hashId(id) % imgs.length] || picsumFallback(id);
}

/** Rewrite known CDN URLs to request right-sized variants for card thumbnails.
 *  Saves significant bandwidth vs. serving full-resolution editorial images. */
function optimizeImageUrl(url: string): string {
  try {
    // Unsplash: enforce reasonable size + quality params.
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("w", "520");
      u.searchParams.set("h", "325");
      u.searchParams.set("fit", "crop");
      u.searchParams.set("auto", "format");
      u.searchParams.set("q", "60");
      return u.toString();
    }
    // Tuko CDN delivers /images/{w}x{h}/file.jpg — rewrite to a smaller variant.
    if (url.includes("cdn.tuko.co.ke/images/")) {
      return url.replace(/\/images\/\d+x\d+\//, "/images/520x292/");
    }
    // Picsum direct URLs.
    if (url.includes("picsum.photos/seed/")) {
      return url.replace(/\/(\d+)\/(\d+)(?=$|\?)/, "/520/325");
    }
  } catch {
    // Fall through and return original on parse errors.
  }
  return url;
}

export function getNewsImage(imageUrl: string | null, category: string, id: string): string {
  if (imageUrl) return optimizeImageUrl(imageUrl);
  return getCategoryImage(category, id);
}

/** onError handler — tries category fallback, then a guaranteed Picsum image. */
export function handleNewsImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  category: string,
  id: string
) {
  const img = e.currentTarget;
  const stage = img.dataset.fallbackStage || "0";

  if (stage === "0") {
    // First failure: try the category fallback (covers broken source images).
    const next = getCategoryImage(category, id);
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
    img.src = picsumFallback(id);
  }
}
