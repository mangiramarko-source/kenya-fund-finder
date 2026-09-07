// Must be the first import: scrubs OAuth token fragments from the URL before
// the Supabase client, analytics, or session recording read the address.
import "./lib/scrubAuthUrlOnLoad";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installConsentScriptGuard } from "./lib/consent-guard";
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.1,
  tracePropagationTargets: ["localhost", "https://caawgzuofnujrznwbuxk.supabase.co"],
  // Session Replay
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Redact authorization headers, api keys, and tokens
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["apikey"];
      delete event.request.headers["x-api-key"];
    }
    if (event.request?.url) {
      try {
        const parsed = new URL(event.request.url);
        if (parsed.hash && (parsed.hash.includes("access_token") || parsed.hash.includes("refresh_token"))) {
          parsed.hash = "";
          event.request.url = parsed.toString();
        }
        if (parsed.searchParams.has("token") || parsed.searchParams.has("code") || parsed.searchParams.has("access_token")) {
          parsed.search = "";
          event.request.url = parsed.toString();
        }
      } catch {
        // ignore parse error
      }
    }
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.data?.url) {
      try {
        const parsed = new URL(breadcrumb.data.url);
        if (parsed.hash && (parsed.hash.includes("access_token") || parsed.hash.includes("refresh_token"))) {
          parsed.hash = "";
          breadcrumb.data.url = parsed.toString();
        }
      } catch {
        // ignore
      }
    }
    return breadcrumb;
  },
});

// Install BEFORE React renders so any script tag that attempts to load is
// inspected against the synchronous consent gate.
installConsentScriptGuard();

createRoot(document.getElementById("root")!).render(<App />);
