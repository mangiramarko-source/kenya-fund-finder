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
    <aside
      aria-label="Cookie and Privacy Consent"
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-[420px] z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      <div className="relative rounded-2xl bg-card/95 dark:bg-[#131316]/95 backdrop-blur-xl border border-border/80 dark:border-white/10 p-4 sm:p-5 shadow-2xl flex flex-col gap-3">
        {!showSettings ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Cookie className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-tight">
                    Cookie &amp; Privacy Choices
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    Data processed by Elyon Innovation LTD
                  </p>
                </div>
              </div>
              <button
                onClick={rejectNonEssential}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors"
                aria-label="Close and reject non-essential cookies"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              We use cookies and local storage to remember your watchlist, portfolio, and analytical preferences.{" "}
              <Link to="/privacy" className="font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                Privacy Policy
              </Link>
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={acceptAll}
                className="flex-1 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all active:scale-[0.99] shadow-sm"
              >
                Accept All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={rejectNonEssential}
                className="flex-1 h-9 rounded-xl border-border/80 text-foreground hover:bg-muted/50 text-xs font-semibold"
              >
                Essential Only
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowSettings(true)}
                className="h-9 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                Customize
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center">
                  <Cookie className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Cookie Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-muted-foreground hover:text-foreground p-1"
                aria-label="Close settings"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[45vh] overflow-y-auto pr-0.5">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Necessary</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Required for site storage, watchlist and auth. Always active.
                  </p>
                </div>
                <Switch checked disabled className="scale-90 origin-right" />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Analytics</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Helps us measure site usage and performance anonymously.
                  </p>
                </div>
                <Switch checked={analytics} onCheckedChange={setAnalytics} className="scale-90 origin-right" />
              </div>

              <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 p-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Advertising</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Delivers relevant market sponsorships and campaign measurement.
                  </p>
                </div>
                <Switch checked={ads} onCheckedChange={setAds} className="scale-90 origin-right" />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
              <Button
                size="sm"
                onClick={saveCustom}
                className="flex-1 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Save Choices
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={acceptAll}
                className="flex-1 h-9 rounded-xl border-border/80 text-foreground text-xs"
              >
                Accept All
              </Button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default CookieConsent;
