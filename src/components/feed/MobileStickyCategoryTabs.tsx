import { useEffect, useRef, useState } from "react";
import {
  getMobileHeaderHeight,
  NEWS_CATEGORY_SENTINEL_ID,
  NEWS_TABS_DOCKED_EVENT,
} from "@/lib/mobileStickyFeed";

interface MobileStickyCategoryTabsProps {
  categories: readonly string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  /** Hide completely on md+ screens when desktop renders its own category bar. */
  mobileOnly?: boolean;
}

/**
 * Mobile sticky category filter bar that rides inline with the page at rest
 * and smoothly animates into a frosted docked header strip beneath the mobile
 * "Market News" navbar while scrolling down, returning to normal at the top.
 */
export default function MobileStickyCategoryTabs({
  categories,
  activeCategory,
  onSelectCategory,
  mobileOnly = false,
}: MobileStickyCategoryTabsProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isDocked, setIsDocked] = useState(false);
  const [motionPhase, setMotionPhase] = useState<"idle" | "dock" | "undock">("idle");
  const prevDockedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId = 0;
    const isDesktop = () =>
      typeof window.matchMedia === "function"
        ? window.matchMedia("(min-width: 768px)").matches
        : window.innerWidth >= 768;

    const checkDocked = () => {
      if (isDesktop()) {
        setIsDocked((prev) => (prev ? false : prev));
        return;
      }
      const sentinel = sentinelRef.current;
      if (!sentinel) return;
      const threshold = getMobileHeaderHeight() - 2;
      const nextDocked = sentinel.getBoundingClientRect().top <= threshold;
      setIsDocked((prev) => (prev !== nextDocked ? nextDocked : prev));
    };

    const scheduleCheck = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(checkDocked);
    };

    checkDocked();
    rafId = requestAnimationFrame(checkDocked);
    window.addEventListener("scroll", checkDocked, { passive: true });
    window.addEventListener("resize", scheduleCheck, { passive: true });

    let observer: IntersectionObserver | null = null;
    const sentinel = sentinelRef.current;
    if (sentinel && typeof IntersectionObserver !== "undefined") {
      try {
        const marginTop = Math.max(0, Math.round(getMobileHeaderHeight() - 2));
        observer = new IntersectionObserver(
          () => {
            checkDocked();
          },
          { rootMargin: `-${marginTop}px 0px 0px 0px`, threshold: 0 },
        );
        observer.observe(sentinel);
      } catch {
        // Passive scroll listener above handles fallback
      }
    }

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", checkDocked);
      window.removeEventListener("resize", scheduleCheck);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (prevDockedRef.current !== isDocked) {
      setMotionPhase(isDocked ? "dock" : "undock");
      prevDockedRef.current = isDocked;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(NEWS_TABS_DOCKED_EVENT, { detail: isDocked }));
    }
  }, [isDocked]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(NEWS_TABS_DOCKED_EVENT, { detail: false }));
      }
    };
  }, []);

  const outerVisibilityClass = mobileOnly
    ? "md:hidden"
    : "md:static md:w-full md:max-w-full md:mx-0 md:bg-transparent md:backdrop-blur-none md:border-b-0 md:shadow-none md:z-auto";

  const dockedOuterClass = isDocked
    ? "bg-background/95 backdrop-blur-md border-b border-border/50 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_12px_-4px_rgba(0,0,0,0.35)]"
    : "bg-transparent border-b border-transparent shadow-none";

  const motionClass =
    motionPhase === "dock"
      ? "animate-category-dock motion-reduce:animate-none"
      : motionPhase === "undock"
        ? "animate-category-undock motion-reduce:animate-none"
        : "";

  return (
    <>
      <div
        id={NEWS_CATEGORY_SENTINEL_ID}
        ref={sentinelRef}
        aria-hidden="true"
        className="h-px w-full -mb-px pointer-events-none md:hidden"
      />
      <div
        data-testid="mobile-news-category-bar"
        data-docked={isDocked ? "true" : "false"}
        className={`sticky z-30 -mx-4 mb-4 top-safe-sticky-tabs transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none ${dockedOuterClass} ${outerVisibilityClass}`}
      >
        <div
          className={`no-scrollbar flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-4 transition-[padding] duration-200 ease-out motion-reduce:transition-none ${
            isDocked ? "py-2.5" : "py-2"
          } ${mobileOnly ? "" : "md:px-0 md:py-2"} ${motionClass}`}
        >
          {categories.map((category) => {
            const isActive = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={(e) => {
                  onSelectCategory(category);
                  const pill = e.currentTarget;
                  const container = pill.parentElement;
                  if (container) {
                    const targetLeft = pill.offsetLeft - (container.clientWidth - pill.clientWidth) / 2;
                    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
                  }
                }}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                  isActive
                    ? "bg-foreground text-background font-bold shadow-xs"
                    : "border border-border/80 bg-background text-zinc-800 dark:text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
