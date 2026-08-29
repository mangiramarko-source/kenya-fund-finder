import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";

vi.mock("./Navbar", () => ({ default: () => null }));
vi.mock("./Footer", () => ({ default: () => null }));
vi.mock("./SkipToContent", () => ({ default: () => null }));
vi.mock("./DesktopTopBar", () => ({ default: () => null }));
vi.mock("./OfflineBanner", () => ({ default: () => null }));
vi.mock("./MobileAiLabFab", () => ({ default: () => null }));
vi.mock("./CurrencyTicker", () => ({ default: () => <div data-testid="currency-ticker" /> }));
vi.mock("@/hooks/usePageView", () => ({ usePageView: vi.fn() }));

function renderLayout(path: "/" | "/stocks") {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<Layout><div>Page content</div></Layout>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout ticker placement", () => {
  it.each(["/", "/stocks"] as const)("mounts one ticker on %s", (path) => {
    renderLayout(path);
    expect(screen.getAllByTestId("currency-ticker")).toHaveLength(1);
  });
});
