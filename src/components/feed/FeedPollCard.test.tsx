import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedPollCard } from "./FeedPollCard";

describe("FeedPollCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders live poll details and voting buttons", () => {
    render(<FeedPollCard id="test-poll-1" />);

    expect(screen.getByText("KFF Community Pulse")).toBeInTheDocument();
    expect(screen.getByText("Live Poll")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bullish/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /bearish/i })).toBeInTheDocument();
  });

  it("records vote, updates localStorage, and displays percentage bar", () => {
    render(<FeedPollCard id="test-poll-1" defaultBulls={10} defaultBears={10} />);

    fireEvent.click(screen.getByRole("button", { name: /bullish/i }));

    expect(screen.getByText(/recorded/i)).toBeInTheDocument();
    expect(screen.getByText(/you voted:/i)).toBeInTheDocument();
    expect(localStorage.getItem("kff_poll_vote_test-poll-1")).toBe("bull");
  });
});
