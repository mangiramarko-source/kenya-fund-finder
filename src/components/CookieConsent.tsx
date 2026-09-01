import { useEffect, useState } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { setConsent } from "@/lib/consent";

const CONSENT_KEY = "cookie-consent";

type Preferences = {
  necessary: true;
  analytics: boolean;
  ads: boolean;
};

const savePreferences = (prefs: Preferences, choice: "accepted" | "rejected" | "custom") => {
  // Single source of truth — also dispatches the same-tab change event.
  setConsent(choice, { analytics: prefs.analytics, ads: prefs.ads });
};

const CookieConsent = () => {
  // SSR-safe: render nothing on the server and on the very first client render.
  // The banner is only mounted after the client has synchronously verified
  // consent via localStorage, so SSR HTML never includes optional UI or scripts
  // and there is no hydration mismatch.
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Defer hydration of the banner until the browser is idle so it does
    // NOT become the LCP element (it's a fixed full-viewport overlay).
    // This lets the actual page content paint first.
    const ric: (cb: () => void) => number =
      (window as any).requestIdleCallback ||
      ((cb: () => void) => window.setTimeout(cb, 1500));
    const cic: (id: number) => void =
      (window as any).cancelIdleCallback || window.clearTimeout;

    const handle = ric(() => {
      try {
        setVisible(!localStorage.getItem(CONSENT_KEY));
      } catch {
        setVisible(false);
      }
      setHydrated(true);
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key !== CONSENT_KEY) return;
      if (e.newValue) {
        setVisible(false);
        setShowSettings(false);
      } else {
        setVisible(true);
      }
    };

    const onOpenSettings = () => {
      setVisible(true);
      setShowSettings(true);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("kff_open_cookie_settings", onOpenSettings);
    return () => {
      cic(handle);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("kff_open_cookie_settings", onOpenSettings);
    };
  }, []);

  const acceptAll = () => {
    savePreferences({ necessary: true, analytics: true, ads: true }, "accepted");
    setVisible(false);
  };

  const rejectNonEssential = () => {
    savePreferences({ necessary: true, analytics: false, ads: false }, "rejected");
    setVisible(false);
  };

  const saveCustom = () => {
    savePreferences({ necessary: true, analytics, ads }, "custom");
    setVisible(false);
  };

  if (!hydrated || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-[420px] rounded-2xl bg-card/95 backdrop-blur-md border border-border p-5 shadow-lg flex flex-col gap-4">
        {!showSettings ? (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <Cookie className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your experience and serve ads. Cookie data is processed by{" "}
                <span className="text-foreground font-medium">Elyon Innovation LTD</span>.{" "}
                <Link to="/privacy" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                  Privacy Policy
                </Link>
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button
                size="sm"
                onClick={acceptAll}
                className="h-9 w-full rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700"
              >
                Accept all cookies
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={rejectNonEssential}
                className="w-full rounded-lg text-sm h-9"
              >
                Reject non-essential cookies
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(true)}
                className="w-full rounded-lg text-sm h-9 text-muted-foreground hover:text-foreground"
              >
                Cookie settings
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cookie className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-foreground">Cookie settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Necessary</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Required for core site functionality. Always active.
                  </p>
                </div>
                <Switch checked disabled />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Analytics</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Helps us understand how the site is used.
                  </p>
                </div>
                <Switch checked={analytics} onCheckedChange={setAnalytics} />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Advertising</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Used to deliver relevant ads and measure performance.
                  </p>
                </div>
                <Switch checked={ads} onCheckedChange={setAds} />
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              See our{" "}
              <Link to="/privacy" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                onClick={saveCustom}
                className="h-9 w-full rounded-lg bg-emerald-600 text-sm text-white hover:bg-emerald-700"
              >
                Save preferences
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={acceptAll}
                className="w-full rounded-lg text-sm h-9"
              >
                Accept all
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieConsent;
