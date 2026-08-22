import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Decode HTML entities (&#8217; &amp; &quot; &#xA0; &#x54; etc.) and strip HTML tags into clean text safely */
export function decodeHtmlEntities(text: string): string {
  if (!text || typeof text !== "string") return text;
  if (!text.includes("&") && !text.includes("<")) return text;
  try {
    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(text, "text/html");
      const decoded = doc.body.textContent;
      if (typeof decoded === "string") {
        // Also check if any nested entities remain
        if (!decoded.includes("&#")) return decoded;
      }
    }
  } catch {
    // Fallback if DOMParser is unavailable or fails
  }
  return text
    .replace(/<[^>]*>/g, "")
    // Hexadecimal entities like &#xA0; or &#x54;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        const code = parseInt(hex, 16);
        return String.fromCharCode(code);
      } catch {
        return "";
      }
    })
    // Decimal entities like &#160; or &#8217;
    .replace(/&#([0-9]+);/g, (_, dec) => {
      try {
        const code = parseInt(dec, 10);
        return String.fromCharCode(code);
      } catch {
        return "";
      }
    })
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
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
    const sentences = paragraph.match(/.*?[.!?]+(?=\s+|$)|.+/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [paragraph];
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

interface NairobiDateParts {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
}

function getNairobiDateParts(input: Date): NairobiDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(input);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    weekday: value("weekday"),
    hour: Number(value("hour")),
  };
}

/** Return the current Nairobi market date, rolling weekends back to Friday. */
export function getNairobiMarketDate(input: Date = new Date()): Date {
  const { year, month, day } = getNairobiDateParts(input);
  const marketDate = new Date(Date.UTC(year, month - 1, day, 9));
  const weekday = marketDate.getUTCDay();
  if (weekday === 6) marketDate.setUTCDate(marketDate.getUTCDate() - 1);
  else if (weekday === 0) marketDate.setUTCDate(marketDate.getUTCDate() - 2);
  return marketDate;
}

/**
 * Returns true if the Kenyan stock market is currently open.
 * Schedule: Monday to Friday, 9:00 AM to 5:00 PM East Africa Time (UTC+3).
 */
export function isKenyanMarketOpen(input: Date = new Date()): boolean {
  try {
    const { weekday, hour } = getNairobiDateParts(input);
    if (weekday === "Sat" || weekday === "Sun") return false;
    return hour >= 9 && hour < 17;
  } catch {
    return false;
  }
}

/**
 * Returns true if Global Markets (FX/Commodities) are currently open.
 * Approx schedule: Sunday 22:00 UTC to Friday 22:00 UTC (24/5).
 */
export function isGlobalMarketOpen(input: Date = new Date()): boolean {
  try {
    const day = input.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const hour = input.getUTCHours();
    
    if (day >= 1 && day <= 4) return true; // Mon-Thu 24h
    if (day === 5 && hour < 22) return true; // Fri before 10 PM UTC
    if (day === 0 && hour >= 22) return true; // Sun after 10 PM UTC
    return false; // Friday late, all Saturday, Sunday early
  } catch {
    return false;
  }
}
