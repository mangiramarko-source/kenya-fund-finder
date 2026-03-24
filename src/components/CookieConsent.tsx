import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CONSENT_KEY = "cookie-consent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setVisible(true);
  }, []);

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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:left-[220px]">
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
  );
};

export default CookieConsent;
