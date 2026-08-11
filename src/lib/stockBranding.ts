const STOCK_DOMAINS: Record<string, string> = {
  BAT: "bat.com",
  COOP: "co-opbank.co.ke",
  EABL: "eabl.com",
  EQTY: "equitygroupholdings.com",
  KCB: "kcbgroup.com",
  KPC: "kpc.co.ke",
  NCBA: "ncbagroup.com",
  PORT: "kpa.co.ke",
  SBIC: "stanbicbank.co.ke",
  SCOM: "safaricom.co.ke",
};

const STOCK_LOGOS: Record<string, string> = {
  EABL: "/images/stocks/eabl.png",
  NCBA: "/images/stocks/ncba.png",
  PORT: "/images/stocks/east-african-portland-cement.png",
  SBIC: "/images/stocks/stanbic-holdings.png",
  SCOM: "/images/stocks/safaricom.png",
};

export function getStockLogoUrl(symbol: string) {
  const normalizedSymbol = symbol.toUpperCase();
  const customLogo = STOCK_LOGOS[normalizedSymbol];
  if (customLogo) return customLogo;

  const domain = STOCK_DOMAINS[normalizedSymbol];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "";
}
