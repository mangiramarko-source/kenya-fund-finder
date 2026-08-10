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

export function getStockLogoUrl(symbol: string) {
  const domain = STOCK_DOMAINS[symbol.toUpperCase()];
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : "";
}
