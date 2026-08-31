import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMinimumLoadingDuration } from "./useMinimumLoadingDuration";

function LoadingProbe({ loading }: { loading: boolean }) {
  const visible = useMinimumLoadingDuration(loading);
  return <span>{visible ? "loading" : "ready"}</span>;
}

describe("useMinimumLoadingDuration", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps a completed load visible for at least 1.5 seconds", () => {
    vi.useFakeTimers();
    const { rerender } = render(<LoadingProbe loading />);

    rerender(<LoadingProbe loading={false} />);
    expect(screen.getByText("loading")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1499));
    expect(screen.getByText("loading")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText("ready")).toBeInTheDocument();
  });
});
