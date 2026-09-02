const FLAG_CDN = "https://flagcdn.com/w80";

const CURRENCY_COUNTRIES: Record<string, string> = {
  USD: "us",
  EUR: "eu",
  GBP: "gb",
  JPY: "jp",
  CHF: "ch",
  CAD: "ca",
  AUD: "au",
  CNY: "cn",
  UGX: "ug",
  ZAR: "za",
  INR: "in",
  TZS: "tz",
  AED: "ae",
  SAR: "sa",
};

/** Returns the country flag associated with a quoted currency code. */
export function getCurrencyFlagUrl(currencyCode?: string | null) {
  const country = CURRENCY_COUNTRIES[currencyCode?.trim().toUpperCase() ?? ""];
  return country ? `${FLAG_CDN}/${country}.png` : undefined;
}

/** Kenya is the fixed quote currency on the FX rates screen. */
export const KENYA_FLAG_URL = `${FLAG_CDN}/ke.png`;
