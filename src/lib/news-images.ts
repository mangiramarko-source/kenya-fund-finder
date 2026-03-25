/** Placeholder images by category when no image_url is set */
const categoryImages: Record<string, string[]> = {
  "Yield Updates": [
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&h=500&fit=crop",
  ],
  "Market News": [
    "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1468254095679-bbcba94a7066?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1604594849809-dfedbc827105?w=800&h=500&fit=crop",
  ],
  "Regulatory Updates": [
    "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&h=500&fit=crop",
  ],
  "Fund Announcements": [
    "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=500&fit=crop",
  ],
};

const fallback = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=500&fit=crop";

export function getNewsImage(imageUrl: string | null, category: string, id: string): string {
  if (imageUrl) return imageUrl;
  const imgs = categoryImages[category] || categoryImages["Market News"]!;
  // Deterministic pick based on id
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return imgs[Math.abs(hash) % imgs.length] || fallback;
}
