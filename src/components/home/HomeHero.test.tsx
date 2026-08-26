import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomeHero from "./HomeHero";

const mocks = vi.hoisted(() => ({ user: { id: "new-user" } as { id: string } | null, authLoading: false, choice: "rejected" as string | null, loading: false, needsWelcome: true, saving: false, save: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.authLoading }) }));
vi.mock("@/hooks/useConsent", () => ({ useConsent: () => ({ choice: mocks.choice }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/hooks/useEmailPreferences", () => ({ useEmailPreferences: () => ({ prefs: { price_alert_email: false, market_brief_email: false }, loading: mocks.loading, needsWelcome: mocks.needsWelcome, saving: mocks.saving, saveWelcome: mocks.save }) }));
beforeEach(() => {
  mocks.user = { id: "new-user" }; mocks.authLoading = false; mocks.choice = "rejected"; mocks.loading = false; mocks.needsWelcome = true; mocks.saving = false;
  mocks.save.mockReset().mockImplementation(async () => { mocks.needsWelcome = false; return true; });
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
    expect(mocks.save).not.toHaveBeenCalled();
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
  it("waits until the cookie banner is answered, including rejection", () => {
    mocks.choice = null;
    const { rerender } = render(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    mocks.choice = "rejected"; rerender(view());
    expect(screen.getByText("Choose your updates")).toBeInTheDocument();
  });
  it("keeps the success screen after completion, then dismisses without a second popup", async () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("button", { name: "Save choices & continue" }));
    await screen.findByText("You're all set.");
    rerender(view());
    expect(screen.getByText("You're all set.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Explore the dashboard" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("closing does not grant consent or reopen the dialog", () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("checkbox", { name: "Price alert emails" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    rerender(view());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("resets drafts when the signed-in account changes", () => {
    const { rerender } = render(view());
    fireEvent.click(screen.getByRole("checkbox", { name: "Price alert emails" }));
    mocks.user = { id: "another-new-user" }; rerender(view());
    expect(screen.getByRole("checkbox", { name: "Price alert emails" })).not.toBeChecked();
  });
});
