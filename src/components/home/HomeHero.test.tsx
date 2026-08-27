import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeHero from "./HomeHero";

const mocks = vi.hoisted(() => ({ user: { id: "new-user" } as { id: string } | null, authLoading: false, choice: "rejected" as string | null, loading: false, needsWelcome: true, saving: false, saveChoices: vi.fn(), complete: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.authLoading }) }));
vi.mock("@/hooks/useConsent", () => ({ useConsent: () => ({ choice: mocks.choice }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useEmailPreferences", () => ({ useEmailPreferences: () => ({ loading: mocks.loading, needsWelcome: mocks.needsWelcome, saving: mocks.saving, saveEmailChoices: mocks.saveChoices, completeWelcome: mocks.complete }) }));
vi.mock("@/hooks/usePortfolio", () => ({ useLiveAssets: () => ({ data: { mmf: [], stock: [], fx: [], commodity: [], fixed_income: [] }, isLoading: false }) }));
beforeEach(() => {
  mocks.user = { id: "new-user" }; mocks.authLoading = false; mocks.choice = "rejected"; mocks.loading = false; mocks.needsWelcome = true; mocks.saving = false;
  mocks.saveChoices.mockReset().mockResolvedValue(true);
  mocks.complete.mockReset().mockImplementation(async () => { mocks.needsWelcome = false; return true; });
  sessionStorage.clear();
});
afterEach(cleanup);
const view = (path = "/") => <MemoryRouter initialEntries={[path]}><HomeHero /></MemoryRouter>;
describe("welcome signup integration", () => {
  it("new signed-in accounts see choices even after seeing the guest introduction", () => {
    sessionStorage.setItem("kff_intro_shown_session_v1", "1");
    render(view());
    expect(screen.getByRole("dialog", { name: "Choose your updates" })).toBeInTheDocument();
  });
  it("does not show subscriptions to existing accounts", () => {
    mocks.needsWelcome = false;
    render(view());
    expect(screen.queryByText("Choose your updates")).not.toBeInTheDocument();
    expect(mocks.saveChoices).not.toHaveBeenCalled();
  });
  it.each(["/auth", "/auth/callback", "/alerts", "/profile"])("does not interrupt %s", path => {
    render(view(path));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("waits for authentication and preferences without flashing a guest dialog", () => {
    mocks.authLoading = true;
    const { rerender } = render(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    mocks.authLoading = false; mocks.loading = true;
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    mocks.loading = false; rerender(view());
    expect(screen.getByText("Choose your updates")).toBeInTheDocument();
  });
  it("shows account setup even before the cookie banner is answered", () => {
    mocks.choice = null;
    render(view());
    expect(screen.getByText("Choose your updates")).toBeInTheDocument();
  });
  it("saves choices only after the optional watchlist and portfolio steps", async () => {
    render(view());
    fireEvent.click(screen.getByRole("button", { name: "Continue to watchlist" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to portfolio" }));
    expect(mocks.saveChoices).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Skip for now" }));
    await screen.findByText("Your dashboard is ready.");
    expect(mocks.saveChoices).toHaveBeenCalledExactlyOnceWith({ price_alert_email: false, market_brief_email: false });
    expect(mocks.complete).toHaveBeenCalledOnce();
  });
  it("closing does not grant consent or reopen the dialog", () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("checkbox", { name: "Price alert emails" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.saveChoices).not.toHaveBeenCalled();
  });
  it("resets drafts when the signed-in account changes", () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("checkbox", { name: "Price alert emails" }));
    mocks.user = { id: "another-new-user" }; rerender(view());
    expect(screen.getByRole("checkbox", { name: "Price alert emails" })).not.toBeChecked();
  });
});
