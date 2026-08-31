import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DeleteAccountCard from "./DeleteAccountCard";

describe("DeleteAccountCard", () => {
  it("blocks administrator self-deletion", () => {
    render(<DeleteAccountCard isAdmin onDelete={vi.fn()} />);

    expect(screen.getByText(/administrator accounts must be removed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete account/i })).not.toBeInTheDocument();
  });

  it("requires the exact DELETE confirmation", async () => {
    const onDelete = vi.fn(async () => undefined);
    render(<DeleteAccountCard isAdmin={false} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
    const submit = screen.getByRole("button", { name: /permanently delete/i });
    const input = screen.getByLabelText(/type delete to confirm/i);

    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: "delete" } });
    expect(submit).toBeDisabled();
    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("keeps the dialog open and presents deletion errors", async () => {
    const onDelete = vi.fn(async () => { throw new Error("Please try again later."); });
    render(<DeleteAccountCard isAdmin={false} onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: /delete account/i }));
    fireEvent.change(screen.getByLabelText(/type delete to confirm/i), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: /permanently delete/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Please try again later.");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});
