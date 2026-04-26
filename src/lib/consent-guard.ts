// Runtime guard: blocks any optional third-party <script> from being inserted
// into the DOM unless either
//   (a) its src origin is on the ESSENTIAL_ALLOWLIST (necessary for the app), or
//   (b) consent has been explicitly verified through the synchronous consent gate
//       for the matching category (`ads` or `analytics`).
//
// This is a belt-and-suspenders complement to going through `onConsent()` —
// even if a developer accidentally hard-codes a tracker, this guard stops it
// from running before consent is granted.
//
// Install once, as early as possible, from main.tsx.

import { hasConsent, type ConsentCategory } from "@/lib/consent";

// Domains required for the app to function (auth, fonts, captcha, our own backend).
// Anything NOT matched here is treated as optional and gated by consent.
const ESSENTIAL_HOST_PATTERNS = [
  /(^|\.)supabase\.co$/i,
  /(^|\.)supabase\.in$/i,
  /(^|\.)gstatic\.com$/i,
  /(^|\.)googleapis\.com$/i,
  /^challenges\.cloudflare\.com$/i,
  /(^|\.)lovable\.app$/i,
  /(^|\.)lovable\.dev$/i,
  /(^|\.)kenyafundfinder\.com$/i,
];

// Map known third-party hosts to a consent category. Anything matched here
// requires the corresponding category to be granted before it loads.
const TRACKER_CATEGORY: { pattern: RegExp; category: ConsentCategory }[] = [
  // Ads
  { pattern: /(^|\.)googlesyndication\.com$/i, category: "ads" },
  { pattern: /(^|\.)doubleclick\.net$/i, category: "ads" },
  { pattern: /(^|\.)adservice\.google\.com$/i, category: "ads" },
  { pattern: /(^|\.)adnxs\.com$/i, category: "ads" },
  { pattern: /(^|\.)pagead2\.googlesyndication\.com$/i, category: "ads" },
  // Analytics
  { pattern: /(^|\.)google-analytics\.com$/i, category: "analytics" },
  { pattern: /(^|\.)googletagmanager\.com$/i, category: "analytics" },
  { pattern: /(^|\.)hotjar\.com$/i, category: "analytics" },
  { pattern: /(^|\.)clarity\.ms$/i, category: "analytics" },
  { pattern: /(^|\.)mixpanel\.com$/i, category: "analytics" },
  { pattern: /(^|\.)segment\.(com|io)$/i, category: "analytics" },
  { pattern: /(^|\.)posthog\.com$/i, category: "analytics" },
  // Pixels / marketing
  { pattern: /(^|\.)facebook\.net$/i, category: "ads" },
  { pattern: /(^|\.)connect\.facebook\.net$/i, category: "ads" },
  { pattern: /(^|\.)tiktok\.com$/i, category: "ads" },
  { pattern: /(^|\.)snap\.licdn\.com$/i, category: "ads" },
];

function classify(src: string): { allowed: boolean; reason: string; category?: ConsentCategory } {
  let host: string;
  try {
    host = new URL(src, window.location.href).hostname;
  } catch {
    // Relative or malformed → treat as same-origin (allowed).
    return { allowed: true, reason: "same-origin or relative" };
  }

  // Same origin is always allowed.
  if (host === window.location.hostname) {
    return { allowed: true, reason: "same-origin" };
  }

  if (ESSENTIAL_HOST_PATTERNS.some((re) => re.test(host))) {
    return { allowed: true, reason: `essential:${host}` };
  }

  const match = TRACKER_CATEGORY.find(({ pattern }) => pattern.test(host));
  if (match) {
    if (hasConsent(match.category)) {
      return { allowed: true, reason: `consent-granted:${match.category}`, category: match.category };
    }
    return { allowed: false, reason: `consent-required:${match.category}`, category: match.category };
  }

  // Unknown third-party domain → conservatively block until any consent is given.
  // (Treat as marketing/ads since most unknown trackers fall there.)
  if (hasConsent("ads") || hasConsent("analytics")) {
    return { allowed: true, reason: `unknown-3p:consent-given:${host}` };
  }
  return { allowed: false, reason: `unknown-3p:no-consent:${host}` };
}

let installed = false;

export function installConsentScriptGuard(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  // 1) Intercept script insertion at the DOM level so even hard-coded
  //    `document.createElement("script")` calls are checked.
  const proto = Element.prototype as unknown as {
    appendChild: <T extends Node>(node: T) => T;
    insertBefore: <T extends Node>(node: T, ref: Node | null) => T;
  };
  const originalAppendChild = proto.appendChild;
  const originalInsertBefore = proto.insertBefore;

  const inspect = <T extends Node>(node: T): T | null => {
    if (!(node instanceof HTMLScriptElement)) return node;
    const src = node.src || node.getAttribute("src") || "";
    if (!src) return node; // inline script — out of scope of third-party guard
    const verdict = classify(src);
    if (!verdict.allowed) {
      console.warn(
        `[consent-guard] Blocked third-party script "${src}" — ${verdict.reason}. ` +
          `Wrap it in onConsent("${verdict.category ?? "ads"}", () => ...).`
      );
      // Strip the src so it cannot execute, and mark for cleanup.
      node.removeAttribute("src");
      node.dataset.consentBlocked = verdict.reason;
      node.type = "text/plain"; // ensure no execution path
      return null;
    }
    return node;
  };

  proto.appendChild = function <T extends Node>(this: Element, node: T): T {
    inspect(node);
    return originalAppendChild.call(this, node) as T;
  };

  proto.insertBefore = function <T extends Node>(this: Element, node: T, ref: Node | null): T {
    inspect(node);
    return originalInsertBefore.call(this, node, ref) as T;
  };

  // 2) MutationObserver as a second line of defence — catches scripts injected
  //    via innerHTML, outerHTML, or document.write.
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLScriptElement && n.src) {
          const verdict = classify(n.src);
          if (!verdict.allowed) {
            console.warn(
              `[consent-guard] Removed late-injected script "${n.src}" — ${verdict.reason}.`
            );
            n.remove();
          }
        }
      });
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
