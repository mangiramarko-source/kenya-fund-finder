import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SaccoTable } from "./SaccoTable";
import { FALLBACK_SACCO_RECORDS } from "@/lib/savingsDataFallback";
import { UniversalCompareProvider } from "@/hooks/useUniversalCompare";

describe("SaccoTable Component", () => {
  it("renders SACCO table and mobile cards without ReferenceError", () => {
    render(
      <UniversalCompareProvider>
        <SaccoTable saccos={FALLBACK_SACCO_RECORDS} />
      </UniversalCompareProvider>
    );

    expect(screen.getByText("All SACCOs")).toBeInTheDocument();
    expect(screen.getByText("Open to Public")).toBeInTheDocument();
    expect(screen.getByText("Highest Interest")).toBeInTheDocument();
  });
});
