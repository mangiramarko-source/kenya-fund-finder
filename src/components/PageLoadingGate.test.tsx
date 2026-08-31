import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PageLoadingGate from "./PageLoadingGate";

describe("PageLoadingGate", () => {
  afterEach(() => vi.useRealTimers());

  it("hides incomplete content until ready and then fades it in", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <PageLoadingGate isReady={false} message="Loading latest stock data…">
        <h1>Stocks</h1>
      </PageLoadingGate>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading latest stock data…");
    expect(screen.queryByRole("heading", { name: "Stocks" })).not.toBeInTheDocument();

    rerender(
      <PageLoadingGate isReady message="Loading latest stock data…">
        <h1>Stocks</h1>
      </PageLoadingGate>,
    );
    act(() => vi.advanceTimersByTime(1500));

    expect(screen.getByRole("heading", { name: "Stocks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stocks" }).parentElement).toHaveClass("fade-in-50");
  });

  it("starts a fresh gate for a changed route parameter", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <PageLoadingGate isReady message="Loading fund…" resetKey="fund-a"><p>Fund A</p></PageLoadingGate>,
    );
    act(() => vi.advanceTimersByTime(1500));

    rerender(
      <PageLoadingGate isReady message="Loading fund…" resetKey="fund-b"><p>Fund B</p></PageLoadingGate>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading fund…");
    expect(screen.queryByText("Fund B")).not.toBeInTheDocument();
  });
});
