import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Link, useLocation } from "react-router-dom";
import { useAndroidBackClose } from "./useAndroidBackClose";

function TestSheetHarness({ initialOpen = true }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const location = useLocation();
  const close = () => setOpen(false);
  useAndroidBackClose(open, close, "test-sheet");

  return (
    <div>
      <div data-testid="current-path">{location.pathname}</div>
      <div data-testid="sheet-state">{open ? "open" : "closed"}</div>
      <button type="button" onClick={close}>
        Close Button
      </button>
      <Link
        to="/privacy"
        onClick={() => {
          // Simulate browser URL changing on Link click alongside React Router state
          window.history.pushState({ idx: 1 }, "", "/privacy");
          close();
        }}
      >
        Go to Privacy
      </Link>
    </div>
  );
}

describe("useAndroidBackClose", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("pushes synthetic sheet state on open and calls history.back() when closed via X button on the same route", () => {
    const backSpy = vi.spyOn(window.history, "back");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestSheetHarness />
      </MemoryRouter>
    );

    expect(window.history.state).toMatchObject({ __kffSheet: "test-sheet" });
    fireEvent.click(screen.getByText("Close Button"));
    expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    expect(backSpy).toHaveBeenCalledTimes(1);
    backSpy.mockRestore();
  });

  it("closes the sheet on popstate (Android hardware back gesture) without calling history.back() again", () => {
    const backSpy = vi.spyOn(window.history, "back");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestSheetHarness />
      </MemoryRouter>
    );

    fireEvent(window, new PopStateEvent("popstate", { state: {} }));
    expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    expect(backSpy).not.toHaveBeenCalled();
    backSpy.mockRestore();
  });

  it("does NOT call history.back() when closing via an internal Link navigation (preserving route transition)", () => {
    const backSpy = vi.spyOn(window.history, "back");
    render(
      <MemoryRouter initialEntries={["/"]}>
        <TestSheetHarness />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("Go to Privacy"));
    expect(screen.getByTestId("sheet-state")).toHaveTextContent("closed");
    expect(screen.getByTestId("current-path")).toHaveTextContent("/privacy");
    expect(backSpy).not.toHaveBeenCalled();
    backSpy.mockRestore();
  });
});
