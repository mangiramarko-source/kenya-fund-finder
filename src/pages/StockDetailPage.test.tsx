import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getOfficialWebsiteLabel, StockAboutCard } from "./StockDetailPage";

describe("StockAboutCard", () => {
  it("renders an original company profile with an official external link", () => {
    render(
      <StockAboutCard
        companyName="Safaricom PLC"
        symbol="SCOM"
        sector="Telecommunications"
        summary="Safaricom provides mobile connectivity, digital services and M-PESA financial products in Kenya and the region."
        officialWebsite="https://www.safaricom.co.ke"
        headquarters="Nairobi, Kenya"
        telephone="+254 703 083 000"
      />,
    );

    expect(screen.getByRole("heading", { name: "About Safaricom PLC" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Company details" })).toBeInTheDocument();
    expect(screen.getByText("Company name")).toBeInTheDocument();
    expect(screen.getByText("SCOM")).toBeInTheDocument();
    expect(screen.getByText("Telecommunications")).toBeInTheDocument();
    expect(screen.getByText("Nairobi, Kenya")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /safaricom\.co\.ke/ });
    expect(link).toHaveAttribute("href", "https://www.safaricom.co.ke");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "+254 703 083 000" })).toHaveAttribute("href", "tel:+254703083000");
    expect(screen.queryByText(/kenyanstocks/i)).not.toBeInTheDocument();
  });

  it("hides the card when an approved profile is unavailable", () => {
    const { container } = render(
      <StockAboutCard companyName="Unverified PLC" symbol="UNV" sector="Other" summary="A reviewed company description that is not accompanied by a verified official website link." />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("rejects unsafe and malformed website addresses", () => {
    expect(getOfficialWebsiteLabel("http://example.com")).toBeNull();
    expect(getOfficialWebsiteLabel("not-a-url")).toBeNull();
    expect(getOfficialWebsiteLabel("https://www.example.com/investors")).toBe("example.com");
  });

  it("leaves unverified contact rows out of an otherwise approved profile", () => {
    render(
      <StockAboutCard
        companyName="Safaricom PLC"
        symbol="SCOM"
        sector="Telecommunications"
        summary="Safaricom provides mobile connectivity, digital services and M-PESA financial products in Kenya and the region."
        officialWebsite="https://www.safaricom.co.ke"
      />,
    );

    expect(screen.queryByText("Head office")).not.toBeInTheDocument();
    expect(screen.queryByText("Phone")).not.toBeInTheDocument();
  });
});
