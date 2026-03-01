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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-lg p-5">
        <div className="flex items-start gap-3">
          <Cookie className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold mb-1">We use cookies</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              We use cookies and similar technologies to enhance your experience, analyse site traffic, and serve personalised ads through Google AdSense. By clicking "Accept", you consent to our use of cookies. Read our{" "}
              <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link> for more details.
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={accept} className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full text-xs px-4">
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={decline} className="rounded-full text-xs px-4">
                Decline
              </Button>
            </div>
          </div>
          <button onClick={decline} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
