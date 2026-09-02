export const normalizeBrandName = (value) => String(value || "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim()
  .replace(/\s+/g, " ");

export function matchesFundManager(manager, aliases) {
  const normalizedManager = normalizeBrandName(manager);
  return aliases.some((alias) => normalizeBrandName(alias) === normalizedManager);
}

export function isOfficialAssetUrl(assetUrl, sourcePage) {
  try {
    const asset = new URL(assetUrl);
    const source = new URL(sourcePage);
    const host = source.hostname.replace(/^www\./, "");
    const assetHost = asset.hostname.replace(/^www\./, "");
    return asset.protocol === "https:" && (assetHost === host || assetHost.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function fileExtension(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  const extension = pathname.match(/\.([a-z0-9]+)$/)?.[1] || "";
  return ["svg", "png", "jpg", "jpeg", "webp"].includes(extension) ? extension : null;
}
