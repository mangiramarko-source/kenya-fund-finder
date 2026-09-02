import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FundLogo from "./FundLogo";

describe("FundLogo", () => {
  it("renders a hosted manager logo with a contained, padded treatment by default", () => {
    const { container } = render(<FundLogo name="Co-op Money Market Fund" logoUrl="https://example.supabase.co/coop.webp" size={44} />);

    const logo = container.querySelector("img");
    if (!logo) throw new Error("Expected hosted fund logo");
    expect(logo).toHaveAttribute("src", "https://example.supabase.co/coop.webp");
    expect(logo).toHaveAttribute("loading", "lazy");
    expect(logo).toHaveClass("object-contain", "p-1.5", "bg-white");
  });

  it("renders a hosted manager logo edge-to-edge when requested for Money Market rows", () => {
    const { container } = render(<FundLogo name="Co-op Money Market Fund" logoUrl="https://example.supabase.co/coop.webp" size={44} fullBleed />);

    const logo = container.querySelector("img");
    if (!logo) throw new Error("Expected hosted fund logo");
    expect(logo).toHaveAttribute("loading", "lazy");
    expect(logo).toHaveClass("object-cover");
    expect(logo).not.toHaveClass("object-contain", "p-1.5");
  });

  it("falls back to initials when the hosted image fails", () => {
    const { container } = render(<FundLogo name="Co-op Money Market Fund" logoUrl="https://example.supabase.co/coop.webp" />);

    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("C")).toBeInTheDocument();
  });
});
