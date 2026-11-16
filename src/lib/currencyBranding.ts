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
  KES: "ke",
  UGX: "ug",
  ZAR: "za",
  INR: "in",
  TZS: "tz",
  RWF: "rw",
  AED: "ae",
  SAR: "sa",
};

/** Returns the country flag associated with a quoted currency code. */
export function getCurrencyFlagUrl(currencyCode?: string | null) {
  const country = CURRENCY_COUNTRIES[currencyCode?.trim().toUpperCase() ?? ""];
  return country ? `${FLAG_CDN}/${country}.png` : undefined;
}

/** Returns the flag image URL for an ISO 3166-1 alpha-2 country code (KE, UG, TZ, RW). */
export function getCountryFlagUrl(countryCode?: string | null) {
  const code = countryCode?.trim().toLowerCase();
  return code && /^[a-z]{2}$/.test(code) ? `${FLAG_CDN}/${code}.png` : undefined;
}

/** Kenya is the fixed quote currency on the FX rates screen. */
export const KENYA_FLAG_URL = `${FLAG_CDN}/ke.png`;
