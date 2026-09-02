const STOCK_LOGOS: Record<string, string> = {
  EABL: "/images/stocks/eabl.png",
  KCB: "/images/stocks/kcb.png",
  NCBA: "/images/stocks/ncba.png",
  PORT: "/images/stocks/east-african-portland-cement.png",
  SBIC: "/images/stocks/stanbic-holdings.png",
  SCOM: "/images/stocks/safaricom.png",
};

/**
 * Prefer the reviewed logo copied to market-logos storage. The bundled images
 * only keep the existing branded rows stable while the catalog is populated.
 */
export function getStockLogoUrl(symbol: string, logoUrl?: string | null) {
  if (logoUrl?.trim()) return logoUrl;
  const normalizedSymbol = symbol.toUpperCase();
  const customLogo = STOCK_LOGOS[normalizedSymbol];
  return customLogo || "";
}
