import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiLabPage from "@/pages/AiLabPage";
import DesktopAiLabChat from "./DesktopAiLabChat";
import { AI_LAB_MESSAGE_STORAGE_KEY, saveAiLabConversation } from "@/lib/aiLab/conversationStorage";
import type { AiLabChatMessage } from "@/lib/aiLab/chat";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null, loading: false }) }));
vi.mock("@/hooks/useDocumentTitle", () => ({ useDocumentTitle: () => undefined }));
vi.mock("@/hooks/useMinimumLoadingDuration", () => ({ useMinimumLoadingDuration: () => false }));
vi.mock("@/lib/aiLab/marketContext", () => ({ useMarketContext: () => ({ data: null }) }));
vi.mock("@/lib/aiLab/newsContext", () => ({ useNewsContext: () => ({ data: null }) }));
vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("@/components/ai-lab/AiLabChat", () => ({
  default: ({ messages }: { messages: AiLabChatMessage[] }) => <div data-testid="conversation-count">{messages.length}</div>,
}));

const storedMessage: AiLabChatMessage = {
  id: "stored-message",
  role: "user",
  text: "Compare SCOM and ABSA",
  createdAt: "2026-09-09T12:00:00.000Z",
  status: "answered",
};

describe("AI Lab retention controls", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
    saveAiLabConversation([storedMessage]);
  });

  it("loads shared history on the full page and clears only the AI conversation", async () => {
    localStorage.setItem("kff_local_watchlist", "preserve-me");
    render(<MemoryRouter><AiLabPage /></MemoryRouter>);

    expect(screen.getByTestId("conversation-count")).toHaveTextContent("1");
    const clearButtons = screen.getAllByRole("button", { name: "Clear AI Lab conversation" });
    await act(async () => fireEvent.click(clearButtons[0]));

    await waitFor(() => expect(screen.getByTestId("conversation-count")).toHaveTextContent("0"));
    expect(localStorage.getItem(AI_LAB_MESSAGE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("kff_local_watchlist")).toBe("preserve-me");
  });

  it("loads the same history in the desktop popup and exposes an accessible clear action", async () => {
    render(<MemoryRouter><DesktopAiLabChat /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open AI Lab chat" }));

    expect(screen.getByTestId("conversation-count")).toHaveTextContent("1");
    const clear = screen.getByRole("button", { name: "Clear AI Lab conversation" });
    expect(clear).toBeEnabled();
    await act(async () => fireEvent.click(clear));

    await waitFor(() => expect(screen.getByTestId("conversation-count")).toHaveTextContent("0"));
    expect(localStorage.getItem(AI_LAB_MESSAGE_STORAGE_KEY)).toBeNull();
  });
});
