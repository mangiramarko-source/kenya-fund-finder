/** Placeholder images by category when no image_url is set.
 *  Large pools (Unsplash, open-source) so different articles in the same
 *  category rarely repeat the same hero image. */
const categoryImages: Record<string, string[]> = {
  "Yield Updates": [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1543286386-713bdd548da4?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1620266757065-5814239881fd?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1638913662529-1d2f1e3a4f6c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1612010167108-3e6b327405f0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1624996379697-f01d168b1a52?w=800&h=500&fit=crop",
  ],
  "Market News": [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559526324-c1f275fbfa32?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1580519542036-c47de6196ba5?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1591033594798-33227a05780d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1560221328-12fe60f83ab8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1586448910202-95e3b6d9b5a4?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=800&h=500&fit=crop",
  ],
  "Regulatory Updates": [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1604357209793-fca5dca89f97?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1591291621164-2c6367723315?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1589994965851-a8f479c573a9?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1589216532372-1c2a367900d9?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1505842465776-3d90f616310d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1593115057322-e94b77572f20?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop",
  ],
  "Fund Announcements": [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1556155092-490a1ba16284?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1606857521015-7f9fcf423740?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&h=500&fit=crop",
  ],
};

const fallback = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop";

/** Strong 32-bit hash so different ids rarely collide on the same image. */
function hashId(id: string): number {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function getFallbackImage(category: string, id: string): string {
  const imgs = categoryImages[category] || categoryImages["Market News"]!;
  return imgs[hashId(id) % imgs.length] || fallback;
}

export function getNewsImage(imageUrl: string | null, category: string, id: string): string {
  if (imageUrl) return imageUrl;
  return getFallbackImage(category, id);
}

/** onError handler for news images — swaps broken src to a category fallback */
export function handleNewsImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  category: string,
  id: string
) {
  const img = e.currentTarget;
  const fb = getFallbackImage(category, id);
  if (img.src !== fb) {
    img.src = fb;
  }
}
