import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import MobileLegalSheet, { openMobileLegalSheet, KFF_OPEN_LEGAL_SHEET_EVENT } from "./MobileLegalSheet";
import MobileAppWatermark from "./MobileAppWatermark";

describe("MobileLegalSheet", () => {
  it("renders when controlled open is true", () => {
    render(
      <BrowserRouter>
        <MobileLegalSheet open={true} onOpenChange={() => {}} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Legal & Disclaimers/i)).toBeInTheDocument();
    expect(screen.getByText(/General Information Only/i)).toBeInTheDocument();
    expect(screen.getByText(/CMA-Regulated Unit Trusts/i)).toBeInTheDocument();
    expect(screen.getByText(/Gross Yields & 15% Withholding Tax/i)).toBeInTheDocument();
    expect(screen.getByText(/Operated by Elyon Innovation LTD/i)).toBeInTheDocument();
  });

  it("opens when openMobileLegalSheet is called", async () => {
    render(
      <BrowserRouter>
        <MobileLegalSheet />
      </BrowserRouter>
    );

    expect(screen.queryByText(/CMA-Regulated Unit Trusts/i)).not.toBeInTheDocument();

    act(() => {
      openMobileLegalSheet();
    });

    expect(await screen.findByText(/CMA-Regulated Unit Trusts/i)).toBeInTheDocument();
  });
});

describe("MobileAppWatermark", () => {
  it("renders mobile disclaimer watermark and dispatches event on click", () => {
    const handler = vi.fn();
    window.addEventListener(KFF_OPEN_LEGAL_SHEET_EVENT, handler);

    render(<MobileAppWatermark />);

    expect(screen.getByText(/Kenya Fund Finder · CMA-Regulated Data/i)).toBeInTheDocument();
    expect(screen.getByText(/Operated by Elyon Innovation LTD/i)).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /Legal & Disclaimers/i });
    fireEvent.click(button);

    expect(handler).toHaveBeenCalled();
    window.removeEventListener(KFF_OPEN_LEGAL_SHEET_EVENT, handler);
  });
});
