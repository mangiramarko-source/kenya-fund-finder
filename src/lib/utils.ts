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
