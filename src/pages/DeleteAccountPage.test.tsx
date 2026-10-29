import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DeleteAccountPage from "./DeleteAccountPage";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null }),
}));

describe("DeleteAccountPage", () => {
  it("renders the account deletion policy and methods cleanly", () => {
    render(
      <MemoryRouter>
        <DeleteAccountPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /request account & data deletion/i })).toBeInTheDocument();
    expect(screen.getByText(/In-App Deletion/i)).toBeInTheDocument();
    expect(screen.getByText(/Submit Deletion Request/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /email privacy support/i })).toHaveAttribute(
      "href",
      expect.stringContaining("mailto:kenyafundfinder@outlook.com")
    );
  });
});
