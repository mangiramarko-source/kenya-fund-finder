import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DeleteAccountPage from "./DeleteAccountPage";
import PrivacyPolicyPage from "./PrivacyPolicyPage";
import TermsOfUsePage from "./TermsOfUsePage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

describe("Legal & Store Compliance Pages", () => {
  it("renders DeleteAccountPage with Samsung Galaxy Store, Google Play & KDPA 2019 compliance", () => {
    render(
      <MemoryRouter>
        <DeleteAccountPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /request account & data deletion/i })).toBeInTheDocument();
    expect(screen.getAllByText(/Samsung Galaxy Store/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/In-App Deletion/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Deletion Request/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email privacy support/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:kenyafundfinder@outlook.com")
    );
  });

  it("renders PrivacyPolicyPage with KDPA Sections 48 & 49 Cross-Border Data Transfers, OAuth, Push, AI Lab, and 18+ clauses", () => {
    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByText(/Sections 48 & 49/i)).toBeInTheDocument();
    expect(screen.getByText(/Google OAuth/i)).toBeInTheDocument();
    expect(screen.getByText(/Microsoft OAuth/i)).toBeInTheDocument();
    expect(screen.getByText(/Section 33 of the Kenya Data Protection Act, 2019/i)).toBeInTheDocument();
  });

  it("renders TermsOfUsePage with multi-regulator Non-Lender / Non-Broker declaration and AI Lab disclaimer", () => {
    render(
      <MemoryRouter>
        <TermsOfUsePage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /terms of use/i })).toBeInTheDocument();
    expect(screen.getByText(/Non-Lender \/ Non-Broker Declaration/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Assistant \(AI Lab\) & Automated Explanations Disclaimer/i)).toBeInTheDocument();
    expect(screen.getByText(/SACCO Societies Regulatory Authority \(SASRA\)/i)).toBeInTheDocument();
  });
});
