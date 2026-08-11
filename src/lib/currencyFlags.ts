const currencyFlags: Record<string, string> = {
  AED: "🇦🇪",
  AUD: "🇦🇺",
  BIF: "🇧🇮",
  CAD: "🇨🇦",
  CHF: "🇨🇭",
  CNY: "🇨🇳",
  ETB: "🇪🇹",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  GHS: "🇬🇭",
  INR: "🇮🇳",
  JPY: "🇯🇵",
  KES: "🇰🇪",
  NGN: "🇳🇬",
  RWF: "🇷🇼",
  SAR: "🇸🇦",
  SGD: "🇸🇬",
  TZS: "🇹🇿",
  UGX: "🇺🇬",
  USD: "🇺🇸",
  ZAR: "🇿🇦",
};

export const getCurrencyFlag = (currencyCode?: string) =>
  currencyFlags[currencyCode?.toUpperCase() || ""] || "🌍";
