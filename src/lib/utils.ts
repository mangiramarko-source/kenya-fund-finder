import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Decode HTML entities (&#8217; &amp; &quot; etc.) and strip HTML tags into clean text */
let _div: HTMLDivElement | null = null;
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (!text.includes("&") && !text.includes("<")) return text;
  if (!_div) _div = document.createElement("div");
  _div.innerHTML = text;
  return _div.textContent || _div.innerText || "";
}

/** Split long article text into readable paragraphs at sentence boundaries. */
export function splitReadableParagraphs(text: string, targetLength = 360): string[] {
  const sourceParagraphs = text.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const result: string[] = [];

  const pushWords = (value: string) => {
    const words = value.split(/\s+/).filter(Boolean);
    let chunk = "";
    words.forEach((word) => {
      const candidate = chunk ? `${chunk} ${word}` : word;
      if (chunk && candidate.length > targetLength) {
        result.push(chunk);
        chunk = word;
      } else {
        chunk = candidate;
      }
    });
    if (chunk) result.push(chunk);
  };

  sourceParagraphs.forEach((paragraph) => {
    const sentences = paragraph.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [paragraph];
    let chunk = "";

    sentences.forEach((sentence) => {
      if (sentence.length > targetLength) {
        if (chunk) result.push(chunk);
        chunk = "";
        pushWords(sentence);
        return;
      }

      const candidate = chunk ? `${chunk} ${sentence}` : sentence;
      if (chunk && candidate.length > targetLength) {
        result.push(chunk);
        chunk = sentence;
      } else {
        chunk = candidate;
      }
    });

    if (chunk) result.push(chunk);
  });

  return result;
}

/**
 * Roll a date back to the most recent weekday (Mon–Fri).
 * Markets are closed on Saturday and Sunday, so any displayed
 * "last updated" date that falls on a weekend should be shown
 * as the prior Friday (preserving the original time-of-day).
 */
export function toLastWeekday(input: string | Date | number): Date {
  if (!input) return new Date("");
  let d: Date;
  if (typeof input === "string" && input.length === 10) {
    // If input is "YYYY-MM-DD", append T12:00:00 to prevent UTC timezone shift backwards
    d = new Date(`${input}T12:00:00`);
  } else {
    d = new Date(input);
  }
  
  if (isNaN(d.getTime())) return d;

  const day = d.getDay(); // 0=Sun, 6=Sat
  if (day === 6) d.setDate(d.getDate() - 1); // Sat → Fri
  else if (day === 0) d.setDate(d.getDate() - 2); // Sun → Fri
  return d;
}

/** Format a market timestamp, snapping weekends back to the prior Friday. */
export function formatMarketDateTime(
  input: string | Date | number,
  locale = "en-KE",
  options?: Intl.DateTimeFormatOptions,
): string {
  try {
    const d = toLastWeekday(input);
    if (isNaN(d.getTime())) return String(input);
    return d.toLocaleString(locale, { ...options, timeZone: "Africa/Nairobi" });
  } catch (e) {
    return String(input);
  }
}

/** Format a market date (no time), snapping weekends back to the prior Friday. */
export function formatMarketDate(
  input: string | Date | number,
  locale = "en-KE",
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
): string {
  try {
    const d = toLastWeekday(input);
    if (isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString(locale, { ...options, timeZone: "Africa/Nairobi" });
  } catch (e) {
    return String(input);
  }
}

/**
 * Returns true if the Kenyan Market is currently open.
 * Schedule: Monday to Friday, 9:00 AM to 6:00 PM (18:00) East Africa Time (UTC+3).
 */
export function isKenyanMarketOpen(): boolean {
  try {
    const now = new Date();
    const eatString = now.toLocaleString("en-US", { timeZone: "Africa/Nairobi" });
    const eatDate = new Date(eatString);
    const day = eatDate.getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    if (day < 1 || day > 5) return false;
    const hours = eatDate.getHours();
    return hours >= 9 && hours < 18;
  } catch {
    return false;
  }
}

/**
 * Returns true if Global Markets (FX/Commodities) are currently open.
 * Approx schedule: Sunday 22:00 UTC to Friday 22:00 UTC (24/5).
 */
export function isGlobalMarketOpen(): boolean {
  try {
    const now = new Date();
    const day = now.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const hour = now.getUTCHours();
    
    if (day >= 1 && day <= 4) return true; // Mon-Thu 24h
    if (day === 5 && hour < 22) return true; // Fri before 10 PM UTC
    if (day === 0 && hour >= 22) return true; // Sun after 10 PM UTC
    return false; // Friday late, all Saturday, Sunday early
  } catch {
    return false;
  }
}
