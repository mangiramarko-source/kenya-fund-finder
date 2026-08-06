/**
 * Safe UUID v4 generator that works on all browsers, including
 * Safari < 15.4 (iOS 15.0–15.3) where crypto.randomUUID() is unavailable.
 */
export function safeUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: build a v4-style UUID from crypto.getRandomValues (Safari 11+)
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    // Set version (4) and variant (RFC 4122) bits
    buf[6] = (buf[6] & 0x0f) | 0x40;
    buf[8] = (buf[8] & 0x3f) | 0x80;
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last resort: Math.random-based (extremely unlikely to reach this)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
