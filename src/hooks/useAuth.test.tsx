import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./useAuth";

const mocks = vi.hoisted(() => ({
  resetUser: vi.fn(),
  identifyUser: vi.fn(),
  authListener: null as null | ((event: string, session: unknown) => void),
}));

vi.mock("@/lib/analytics", () => ({
  resetUser: mocks.resetUser,
  identifyUser: mocks.identifyUser,
}));

vi.mock("@/integrations/supabase/client", () => ({
  SUPABASE_PROJECT_ID: "test",
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: (cb: (event: string, session: unknown) => void) => {
        mocks.authListener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
  },
}));

describe("AuthProvider analytics identity", () => {
  beforeEach(() => {
    mocks.resetUser.mockClear();
    mocks.authListener = null;
  });

  it("keeps the guest analytics identity on the initial page-load auth event", async () => {
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(mocks.authListener).not.toBeNull());

    mocks.authListener!("INITIAL_SESSION", null);

    expect(mocks.resetUser).not.toHaveBeenCalled();
  });

  it("resets the analytics identity when the user signs out", async () => {
    render(<AuthProvider><div /></AuthProvider>);
    await waitFor(() => expect(mocks.authListener).not.toBeNull());

    mocks.authListener!("SIGNED_OUT", null);

    expect(mocks.resetUser).toHaveBeenCalledTimes(1);
  });
});
