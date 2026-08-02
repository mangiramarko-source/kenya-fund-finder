import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Decode HTML entities (&#8217; &amp; &quot; etc.) into clean text */
let _textarea: HTMLTextAreaElement | null = null;
export function decodeHtmlEntities(text: string): string {
  if (!text || (!text.includes("&") && !text.includes("&#"))) return text;
  if (!_textarea) _textarea = document.createElement("textarea");
  _textarea.innerHTML = text;
  return _textarea.value;
}

/**
 * Roll a date back to the most recent weekday (Mon–Fri).
 * Markets are closed on Saturday and Sunday, so any displayed
 * "last updated" date that falls on a weekend should be shown
 * as the prior Friday (preserving the original time-of-day).
 */
export function toLastWeekday(input: string | Date): Date {
  const d = new Date(input);
  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 6) d.setDate(d.getDate() - 1); // Sat → Fri
  else if (day === 0) d.setDate(d.getDate() - 2); // Sun → Fri
  return d;
}

/** Format a market timestamp, snapping weekends back to the prior Friday. */
export function formatMarketDateTime(
  input: string | Date,
  locale = "en-KE",
  options?: Intl.DateTimeFormatOptions,
): string {
  return toLastWeekday(input).toLocaleString(locale, options);
}

/** Format a market date (no time), snapping weekends back to the prior Friday. */
export function formatMarketDate(
  input: string | Date,
  locale = "en-KE",
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  return toLastWeekday(input).toLocaleDateString(locale, options);
}

/**
 * Returns true if the Kenyan Market is currently open.
 * Schedule: Monday to Friday, 8:00 AM to 6:00 PM (18:00) East Africa Time (UTC+3).
 */
export function isKenyanMarketOpen(): boolean {
  try {
    const now = new Date();
    const eatString = now.toLocaleString("en-US", { timeZone: "Africa/Nairobi" });
    const eatDate = new Date(eatString);
    const day = eatDate.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    if (day < 1 || day > 5) return false;
    const hours = eatDate.getHours();
    return hours >= 8 && hours < 18;
  } catch {
    return false;
  }
}

