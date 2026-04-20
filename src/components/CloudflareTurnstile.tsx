import { useEffect, useRef, useCallback, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = "0x4AAAAAACyf2euQ1UP1gATD";

type Status = "loading" | "verifying" | "verified" | "error";

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /** Exposes honeypot value and form load timestamp for bot detection */
  onBotFields?: (fields: { honeypot: string; formLoadedAt: number }) => void;
}

const CloudflareTurnstile = ({ onVerify, onExpire, onBotFields }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("loading");
  const formLoadedAtRef = useRef(Date.now());

  // Report bot fields to parent whenever honeypot changes
  useEffect(() => {
    onBotFields?.({ honeypot, formLoadedAt: formLoadedAtRef.current });
  }, [honeypot, onBotFields]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    setStatus("verifying");
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      size: "flexible",
      theme: "dark",
      appearance: "always",
      callback: (token: string) => {
        setStatus("verified");
        onVerify(token);
      },
      "expired-callback": () => {
        setStatus("verifying");
        onExpire?.();
      },
      "error-callback": () => {
        setStatus("error");
        onExpire?.();
      },
      "timeout-callback": () => {
        setStatus("error");
        onExpire?.();
      },
    });
  }, [onVerify, onExpire]);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  const statusContent = {
    loading: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: "Loading security check…", className: "text-muted-foreground" },
    verifying: { icon: <Loader2 className="h-3 w-3 animate-spin" />, text: "Verifying you're human…", className: "text-muted-foreground" },
    verified: { icon: <CheckCircle2 className="h-3 w-3" />, text: "Verified — signing you in", className: "text-accent" },
    error: { icon: <ShieldAlert className="h-3 w-3" />, text: "Verification failed. Please retry.", className: "text-destructive" },
  }[status];

  return (
    <div className="space-y-2">
      {/* Honeypot field – hidden from real users, visible to bots */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", top: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      <div ref={containerRef} className="flex justify-center min-h-[65px]" />
      <div className={`flex items-center justify-center gap-1.5 text-[11px] ${statusContent.className}`} aria-live="polite">
        {statusContent.icon}
        <span>{statusContent.text}</span>
      </div>
    </div>
  );
};

export default CloudflareTurnstile;
