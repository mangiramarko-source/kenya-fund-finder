import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FeedTriviaCard } from "./FeedTriviaCard";

describe("FeedTriviaCard", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders trivia challenge and options", () => {
    render(<FeedTriviaCard id="test-trivia-1" />);

    expect(screen.getByText("Kenya Market Trivia")).toBeInTheDocument();
    expect(screen.getByText("Daily Challenge")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^5%$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^15%$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^20%$/ })).toBeInTheDocument();
  });

  it("reveals explanation and increments streak on correct answer", () => {
    render(<FeedTriviaCard id="test-trivia-1" />);

    fireEvent.click(screen.getByRole("button", { name: /15%/i }));

    expect(screen.getByText(/did you know\?/i)).toBeInTheDocument();
    expect(screen.getByText(/section 35 of the income tax act/i)).toBeInTheDocument();
    expect(localStorage.getItem("kff_trivia_answer_test-trivia-1")).toBe("B");
  });
});
