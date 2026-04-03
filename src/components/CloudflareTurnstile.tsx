import { useEffect, useRef, useCallback, useState } from "react";

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
  const formLoadedAtRef = useRef(Date.now());

  // Report bot fields to parent whenever honeypot changes
  useEffect(() => {
    onBotFields?.({ honeypot, formLoadedAt: formLoadedAtRef.current });
  }, [honeypot, onBotFields]);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      size: "invisible",
      callback: (token: string) => onVerify(token),
      "expired-callback": () => onExpire?.(),
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

  return (
    <>
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
      <div ref={containerRef} />
    </>
  );
};

export default CloudflareTurnstile;
