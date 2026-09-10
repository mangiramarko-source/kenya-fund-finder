import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const KORA_GREETING_SEEN_KEY = "kff-kora-greeting-seen";

interface KoraAiLauncherProps {
  onActivate: () => void;
  className?: string;
  compact?: boolean;
}

export default function KoraAiLauncher({ onActivate, className, compact = false }: KoraAiLauncherProps) {
  const [showGreeting, setShowGreeting] = useState(false);

  useEffect(() => {
    try {
      setShowGreeting(sessionStorage.getItem(KORA_GREETING_SEEN_KEY) !== "1");
    } catch {
      setShowGreeting(true);
    }
  }, []);

  useEffect(() => {
    if (!showGreeting) return;
    const timeout = window.setTimeout(() => {
      try {
        sessionStorage.setItem(KORA_GREETING_SEEN_KEY, "1");
      } catch {
        // The launcher remains usable when storage is unavailable.
      }
      setShowGreeting(false);
    }, 6000);
    return () => window.clearTimeout(timeout);
  }, [showGreeting]);

  const activate = () => {
    try {
      sessionStorage.setItem(KORA_GREETING_SEEN_KEY, "1");
    } catch {
      // The launcher remains usable when storage is unavailable.
    }
    setShowGreeting(false);
    onActivate();
  };

  return (
    <div className={cn("relative flex flex-col items-end", className)}>
      {!compact && showGreeting && (
        <div className="relative mb-2.5 mr-1 max-w-[min(290px,calc(100vw-2rem))] rounded-[24px] border border-emerald-200/70 bg-black px-5 py-3.5 text-left text-white shadow-xl shadow-emerald-950/15 dark:border-emerald-400/20 dark:bg-white dark:text-slate-900">
          <p className="text-[clamp(1rem,2.4vw,1.35rem)] font-semibold leading-tight tracking-tight">
            Hi! I&apos;m Kora <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-1 text-[clamp(.9rem,2vw,1.1rem)] leading-tight text-white dark:text-slate-900">Need help with Kenyan markets?</p>
          <span className="absolute -bottom-3 right-10 h-5 w-5 rotate-45 border-b border-r border-emerald-200/70 bg-black dark:border-emerald-400/20 dark:bg-white" aria-hidden="true" />
        </div>
      )}
      {!showGreeting && (
        <span className="mb-1.5 mr-5 rounded-full border border-emerald-400/30 bg-black px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white shadow-md dark:bg-white dark:text-slate-900" aria-hidden="true">
          AI
        </span>
      )}
      <button
        type="button"
        onClick={activate}
        aria-label="Open Kora AI assistant"
        className="group relative h-16 w-16 overflow-visible rounded-full border-[3px] border-emerald-400 bg-slate-950 p-0.5 shadow-lg shadow-emerald-950/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-[76px] md:w-[76px]"
      >
        <img src="/kora/kora-avatar.png" alt="Kora" className="h-full w-full rounded-full object-cover object-top" />
        <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.9)]" aria-label="Kora is available" />
      </button>
    </div>
  );
}
