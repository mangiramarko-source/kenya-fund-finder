import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie-consent";

const CookieConsent = () => {
  // Read synchronously on first render so the banner either appears at FCP
  // (no longer counted as a late LCP) or never blocks layout at all.
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem(CONSENT_KEY);
    } catch {
      return false;
    }
  });

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Mobile: centered floating card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:hidden">
        <div className="absolute inset-0 bg-black/40" onClick={decline} />
        <div className="relative w-full max-w-[320px] rounded-2xl bg-card/95 backdrop-blur-md border border-border p-5 shadow-lg flex flex-col items-center gap-4 text-center">
          <Cookie className="h-6 w-6 text-accent" />
          <p className="text-sm text-muted-foreground">
            We use cookies to enhance your experience and serve ads.{" "}
            <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          </p>
          <div className="flex items-center gap-3 w-full">
            <Button size="sm" onClick={accept} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg text-sm h-9">
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={decline} className="flex-1 rounded-lg text-sm h-9 text-muted-foreground hover:text-foreground">
              Decline
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop: bottom bar (unchanged) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:left-[220px] hidden md:block">
        <div className="flex items-center gap-3 px-4 py-2.5 bg-card/95 backdrop-blur-md border-t border-border">
          <Cookie className="h-4 w-4 text-accent shrink-0" />
          <p className="text-xs text-muted-foreground flex-1 min-w-0">
            We use cookies to enhance your experience and serve ads.{" "}
            <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={accept} className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg text-xs h-7 px-3">
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={decline} className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground">
              Decline
            </Button>
          </div>
          <button onClick={decline} className="text-muted-foreground hover:text-foreground shrink-0 ml-1" aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default CookieConsent;
