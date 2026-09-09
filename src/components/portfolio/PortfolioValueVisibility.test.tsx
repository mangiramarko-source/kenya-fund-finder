import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import PortfolioValueToggle, { PortfolioSensitiveValue } from "./PortfolioValueVisibility";

describe("PortfolioValueVisibility", () => {
  it("masks values by default and reveals them with the accessible toggle", () => {
    function Harness() {
      const [visible, setVisible] = useState(false);
      return (
        <>
          <PortfolioSensitiveValue value="Ksh 2,242,706.42" visible={visible} />
          <PortfolioValueToggle visible={visible} onToggle={() => setVisible((current) => !current)} />
        </>
      );
    }

    render(<Harness />);
    const toggle = screen.getByRole("button", { name: "Show portfolio values" });
    expect(screen.getByText("••••••")).toBeInTheDocument();
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);
    expect(screen.getByText("Ksh 2,242,706.42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide portfolio values" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Hide portfolio values" }));
    expect(screen.getByText("••••••")).toBeInTheDocument();
  });
});
