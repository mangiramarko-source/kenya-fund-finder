import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ChooseUpdates from "./ChooseUpdates";

afterEach(cleanup);
function setup(onSave = vi.fn().mockResolvedValue(true)) {
  const onContinue = vi.fn();
  const onCreateAlert = vi.fn();
  render(<Dialog open><DialogContent><ChooseUpdates onSave={onSave} onContinue={onContinue} onCreateAlert={onCreateAlert} /></DialogContent></Dialog>);
  return { onSave, onContinue, onCreateAlert };
}
describe("Choose your updates", () => {
  it("respects preferences already saved in Settings before welcome completion", () => {
    render(<Dialog open><DialogContent><ChooseUpdates initialChoices={{ price_alert_email: true, market_brief_email: false }} onSave={vi.fn()} onContinue={vi.fn()} onCreateAlert={vi.fn()} /></DialogContent></Dialog>);
    expect(screen.getByRole("checkbox", { name: "Price alert emails" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Market Brief & Morning News" })).not.toBeChecked();
  });
  it("starts with both email choices unchecked and does not save on render", () => {
    const { onSave } = setup();
    for (const checkbox of screen.getAllByRole("checkbox")) expect(checkbox).not.toBeChecked();
    expect(onSave).not.toHaveBeenCalled();
  });
  it.each([[true, false], [false, true], [true, true], [false, false]])("saves independently: price=%s brief=%s", async (price, brief) => {
    const { onSave, onCreateAlert } = setup();
    if (price) fireEvent.click(screen.getByRole("checkbox", { name: "Price alert emails" }));
    if (brief) fireEvent.click(screen.getByRole("checkbox", { name: "Market Brief & Morning News" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices & continue" }));
    await screen.findByText("You're all set.");
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ price_alert_email: price, market_brief_email: brief });
    expect(onCreateAlert).not.toHaveBeenCalled();
    if (price) {
      fireEvent.click(screen.getByRole("button", { name: "Create your first price alert" }));
      expect(onCreateAlert).toHaveBeenCalledOnce();
    }
  });
  it("No thanks clears both drafts and saves an explicit opt-out", async () => {
    const { onSave } = setup();
    screen.getAllByRole("checkbox").forEach(box => fireEvent.click(box));
    fireEvent.click(screen.getByRole("button", { name: "No thanks, continue without updates" }));
    await screen.findByText("You're all set.");
    expect(onSave).toHaveBeenCalledExactlyOnceWith({ price_alert_email: false, market_brief_email: false });
  });
  it("does not claim success on failed save, and allows retry or dismissal", async () => {
    const { onSave, onContinue } = setup(vi.fn().mockResolvedValue(false));
    fireEvent.click(screen.getByRole("checkbox", { name: "Price alert emails" }));
    fireEvent.click(screen.getByRole("button", { name: "Save choices & continue" }));
    await screen.findByRole("alert");
    expect(screen.queryByText("You're all set.")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Price alert emails" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Continue without saving" }));
    expect(onContinue).toHaveBeenCalledOnce();
    onSave.mockResolvedValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Save choices & continue" }));
    await screen.findByText("You're all set.");
  });
  it("locks both buttons and choices during a pending save", async () => {
    let resolve!: (value: boolean) => void;
    const { onSave } = setup(vi.fn(() => new Promise<boolean>(r => { resolve = r; })));
    fireEvent.click(screen.getByRole("button", { name: "Save choices & continue" }));
    fireEvent.click(screen.getByRole("button", { name: "No thanks, continue without updates" }));
    expect(onSave).toHaveBeenCalledOnce();
    screen.getAllByRole("checkbox").forEach(box => expect(box).toBeDisabled());
    resolve(true);
    await waitFor(() => expect(screen.getByText("You're all set.")).toBeInTheDocument());
  });
});
