import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StoriesHeader from "./StoriesHeader";

// Mock supabase client to return empty list
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            or: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

describe("StoriesHeader Component", () => {
  it("renders an empty container cleanly without layout shift when no stories exist", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <StoriesHeader />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Should render empty-safe div or nothing
    const section = container.querySelector("section");
    expect(section).toBeNull();
  });
});
