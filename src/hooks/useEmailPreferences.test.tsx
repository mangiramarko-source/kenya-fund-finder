import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmailPreferences } from "./useEmailPreferences";

const state = vi.hoisted(() => ({ user: { id: "user-a" } as { id: string } | null, single: vi.fn(), update: vi.fn(), eq: vi.fn(), select: vi.fn(), from: vi.fn(), invoke: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: state.from, functions: { invoke: state.invoke } } }));
const row = (id = "user-a", completed = false) => ({
  user_id: id, price_alert_email: false, price_alert_inapp: true, price_alert_push: false, market_brief_email: false,
  email_welcome_completed: completed, price_alert_email_consented_at: null, market_brief_email_consented_at: null,
});
function setup() {
  const cache = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>;
  return { ...renderHook(useEmailPreferences, { wrapper }), cache, wrapper };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.user = { id: "user-a" };
  const chain = { select: state.select, eq: state.eq, single: state.single, update: state.update };
  state.from.mockReturnValue(chain); state.select.mockReturnValue(chain); state.eq.mockReturnValue(chain); state.update.mockReturnValue(chain);
  state.single.mockResolvedValue({ data: row(), error: null });
  state.invoke.mockResolvedValue({ data: { preferences: row() }, error: null });
});
afterEach(cleanup);
describe("email preference persistence", () => {
  it("does not query or save for a guest", async () => {
    state.user = null;
    const { result } = setup();
    expect(result.current.prefs.price_alert_email).toBe(false);
    await waitFor(() => expect(result.current.needsWelcome).toBe(false));
    expect(await result.current.saveWelcome({ price_alert_email: true, market_brief_email: true })).toBe(false);
    expect(state.from).not.toHaveBeenCalled();
  });
  it("loads the owner row, preserves in-app choice and completes welcome atomically", async () => {
    const { result, cache } = setup();
    await waitFor(() => expect(result.current.needsWelcome).toBe(true));
    const saved = { ...row(), price_alert_email: true, price_alert_email_consented_at: "2026-08-26T20:00:00Z", email_welcome_completed: true };
    state.invoke.mockResolvedValue({ data: { preferences: saved }, error: null });
    await act(async () => { expect(await result.current.saveWelcome({ price_alert_email: true, market_brief_email: false })).toBe(true); });
    expect(state.invoke).toHaveBeenCalledExactlyOnceWith("update-communication-preferences", { body: { price_alert_email: true, market_brief_email: false, email_welcome_completed: true } });
    expect(state.update).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.needsWelcome).toBe(false));
    expect(cache.getQueryData(["communication-preferences", "user-a"])).toEqual(saved);
  });
  it("retains existing choices and does not enroll existing accounts", async () => {
    state.single.mockResolvedValue({ data: {
      ...row("user-a", true), price_alert_email: true, market_brief_email: true,
      price_alert_email_consented_at: null, market_brief_email_consented_at: "2026-08-24T12:00:00Z",
    }, error: null });
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.needsWelcome).toBe(false);
    expect(result.current.prefs.market_brief_email).toBe(true);
    expect(result.current.prefs.price_alert_email).toBe(false);
    expect(state.update).not.toHaveBeenCalled();
  });
  it.each([{ data: null, error: null }, { data: null, error: { message: "offline" } }])("fails closed on missing/failed reads", async response => {
    state.single.mockResolvedValue(response);
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.needsWelcome).toBe(false);
    expect(result.current.prefs.price_alert_email).toBe(false);
    expect(state.update).not.toHaveBeenCalled();
  });
  it("does not update cache on a failed or zero-row write", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    state.invoke.mockResolvedValue({ data: null, error: null });
    await act(async () => { expect(await result.current.updatePref("market_brief_email", true)).toBe(false); });
    expect(result.current.prefs.market_brief_email).toBe(false);
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it("updates other mounted settings consumers from the same saved row", async () => {
    const { result, wrapper } = setup();
    const second = renderHook(useEmailPreferences, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    state.invoke.mockResolvedValue({ data: { preferences: { ...row(), market_brief_email: true, market_brief_email_consented_at: "2026-08-26T20:00:00Z" } }, error: null });
    await act(async () => { await result.current.updatePref("market_brief_email", true); });
    await waitFor(() => expect(second.result.current.prefs.market_brief_email).toBe(true));
  });
  it("persists device push separately from email preferences", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    state.single.mockResolvedValue({ data: { ...row(), price_alert_push: true }, error: null });
    await act(async () => { expect(await result.current.updatePref("price_alert_push", true)).toBe(true); });
    expect(state.update).toHaveBeenCalledWith({ price_alert_push: true });
    expect(state.invoke).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.prefs.price_alert_push).toBe(true));
  });
  it("does not leak cached choices between accounts", async () => {
    state.single.mockResolvedValue({ data: { ...row(), market_brief_email: true, market_brief_email_consented_at: "2026-08-26T20:00:00Z" }, error: null });
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.prefs.market_brief_email).toBe(true));
    state.user = { id: "user-b" };
    state.single.mockResolvedValue({ data: row("user-b"), error: null });
    rerender();
    expect(result.current.prefs.market_brief_email).toBe(false);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(state.eq).toHaveBeenLastCalledWith("user_id", "user-b");
  });
});
