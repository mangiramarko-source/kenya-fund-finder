import { useState } from "react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={decline} />
      <div className="relative w-full max-w-[360px] rounded-2xl bg-card/95 backdrop-blur-md border border-border p-5 shadow-lg flex flex-col items-center gap-4 text-center">
        <Cookie className="h-6 w-6 text-accent" />
        <p className="text-sm text-muted-foreground">
          We use cookies to enhance your experience and serve ads. Cookie data is processed by <span className="text-foreground font-medium">Elyon Innovation LTD</span>.{" "}
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
        <button onClick={decline} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CookieConsent;
