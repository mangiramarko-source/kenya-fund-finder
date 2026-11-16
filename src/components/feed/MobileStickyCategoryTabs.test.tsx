import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import MobileStickyCategoryTabs from "./MobileStickyCategoryTabs";
import {
  NEWS_CATEGORY_SENTINEL_ID,
  NEWS_TABS_DOCKED_EVENT,
} from "@/lib/mobileStickyFeed";

const CATEGORIES = ["All", "Stocks", "Kenyan", "International", "Funds & Fixed Income"] as const;

describe("MobileStickyCategoryTabs", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    document.documentElement.style.setProperty("--kf-mobile-header", "64px");
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.style.removeProperty("--kf-mobile-header");
  });

  it("renders inline at rest and smoothly docks/undocks on mobile scroll", () => {
    const dockedEvents: boolean[] = [];
    const listener = (e: Event) => {
      dockedEvents.push(Boolean((e as CustomEvent<boolean>).detail));
    };
    window.addEventListener(NEWS_TABS_DOCKED_EVENT, listener);

    const onSelect = vi.fn();
    render(
      <MobileStickyCategoryTabs
        categories={CATEGORIES}
        activeCategory="All"
        onSelectCategory={onSelect}
      />,
    );

    const sentinel = document.getElementById(NEWS_CATEGORY_SENTINEL_ID)!;
    const bar = screen.getByTestId("mobile-news-category-bar");
    const scroller = bar.firstElementChild as HTMLElement;

    // 1. At rest (sentinel below mobile header)
    sentinel.getBoundingClientRect = vi.fn(() => ({
      top: 180,
      bottom: 181,
      left: 0,
      right: 390,
      width: 390,
      height: 1,
      x: 0,
      y: 180,
      toJSON: () => {},
    }));
    fireEvent.scroll(window);

    expect(bar).toHaveAttribute("data-docked", "false");
    expect(bar).toHaveClass("bg-transparent", "border-transparent");
    expect(scroller).not.toHaveClass("animate-category-dock");

    // 2. Scroll down past threshold (sentinel top <= 62px)
    sentinel.getBoundingClientRect = vi.fn(() => ({
      top: 58,
      bottom: 59,
      left: 0,
      right: 390,
      width: 390,
      height: 1,
      x: 0,
      y: 58,
      toJSON: () => {},
    }));
    fireEvent.scroll(window);

    expect(bar).toHaveAttribute("data-docked", "true");
    expect(bar).toHaveClass("bg-background/95", "backdrop-blur-md", "border-border/50");
    expect(scroller).toHaveClass("animate-category-dock", "py-2.5");
    expect(dockedEvents).toContain(true);

    // 3. Scroll back up (sentinel top > 62px) -> smoothly returns to normal
    sentinel.getBoundingClientRect = vi.fn(() => ({
      top: 120,
      bottom: 121,
      left: 0,
      right: 390,
      width: 390,
      height: 1,
      x: 0,
      y: 120,
      toJSON: () => {},
    }));
    fireEvent.scroll(window);

    expect(bar).toHaveAttribute("data-docked", "false");
    expect(bar).toHaveClass("bg-transparent", "border-transparent");
    expect(scroller).toHaveClass("animate-category-undock", "py-2");
    expect(dockedEvents[dockedEvents.length - 1]).toBe(false);

    window.removeEventListener(NEWS_TABS_DOCKED_EVENT, listener);
  });

  it("stays undocked on desktop viewports even when scrolled", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 768px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <MobileStickyCategoryTabs
        categories={CATEGORIES}
        activeCategory="All"
        onSelectCategory={vi.fn()}
      />,
    );

    const sentinel = document.getElementById(NEWS_CATEGORY_SENTINEL_ID)!;
    sentinel.getBoundingClientRect = vi.fn(() => ({
      top: 10,
      bottom: 11,
      left: 0,
      right: 1024,
      width: 1024,
      height: 1,
      x: 0,
      y: 10,
      toJSON: () => {},
    }));
    fireEvent.scroll(window);

    expect(screen.getByTestId("mobile-news-category-bar")).toHaveAttribute("data-docked", "false");
  });

  it("calls onSelectCategory and centers the clicked pill", () => {
    const onSelect = vi.fn();
    render(
      <MobileStickyCategoryTabs
        categories={CATEGORIES}
        activeCategory="All"
        onSelectCategory={onSelect}
      />,
    );

    const bar = screen.getByTestId("mobile-news-category-bar");
    const scroller = bar.firstElementChild as HTMLElement;
    scroller.scrollTo = vi.fn();

    fireEvent.click(screen.getByRole("button", { name: "Stocks" }));
    expect(onSelect).toHaveBeenCalledWith("Stocks");
    expect(scroller.scrollTo).toHaveBeenCalled();
  });
});
