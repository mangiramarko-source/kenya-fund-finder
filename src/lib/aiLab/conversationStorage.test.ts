import { beforeEach, describe, expect, it } from "vitest";
import type { AiLabChatMessage } from "@/lib/aiLab/chat";
import {
  AI_LAB_MESSAGE_LIMIT,
  AI_LAB_MESSAGE_STORAGE_KEY,
  AI_LAB_RETENTION_MS,
  clearAiLabConversation,
  loadAiLabConversation,
  saveAiLabConversation,
} from "./conversationStorage";

const NOW = Date.parse("2026-09-09T12:00:00.000Z");

function message(index: number, status: AiLabChatMessage["status"] = "answered"): AiLabChatMessage {
  return {
    id: `message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    text: `Message ${index}`,
    createdAt: new Date(NOW - index * 1_000).toISOString(),
    status,
  };
}

describe("AI Lab conversation storage", () => {
  beforeEach(() => localStorage.clear());

  it("loads the valid timestamped format and drops pending placeholders", () => {
    localStorage.setItem(AI_LAB_MESSAGE_STORAGE_KEY, JSON.stringify({
      version: 2,
      updatedAt: new Date(NOW - 1_000).toISOString(),
      messages: [message(1), message(2, "pending")],
    }));

    expect(loadAiLabConversation(localStorage, NOW)).toEqual([message(1)]);
  });

  it("stores only the latest 50 non-pending messages with an updated timestamp", () => {
    saveAiLabConversation([...Array.from({ length: 55 }, (_, index) => message(index)), message(99, "pending")], localStorage, NOW);

    const raw = localStorage.getItem(AI_LAB_MESSAGE_STORAGE_KEY);
    const stored = JSON.parse(raw ?? "null");
    expect(stored).toMatchObject({ version: 2, updatedAt: new Date(NOW).toISOString() });
    expect(stored.messages).toHaveLength(AI_LAB_MESSAGE_LIMIT);
    expect(stored.messages[0].id).toBe("message-5");
    expect(stored.messages.at(-1).id).toBe("message-54");
  });

  it.each([
    ["malformed JSON", "not-json"],
    ["legacy array", JSON.stringify([message(1)])],
    ["invalid envelope", JSON.stringify({ version: 2, updatedAt: "invalid", messages: [] })],
    ["malformed message", JSON.stringify({ version: 2, updatedAt: new Date(NOW).toISOString(), messages: [{ id: 1 }] })],
  ])("treats %s as empty and removes it", (_label, value) => {
    localStorage.setItem(AI_LAB_MESSAGE_STORAGE_KEY, value);
    expect(loadAiLabConversation(localStorage, NOW)).toEqual([]);
    expect(localStorage.getItem(AI_LAB_MESSAGE_STORAGE_KEY)).toBeNull();
  });

  it("expires history after 30 days of inactivity", () => {
    localStorage.setItem(AI_LAB_MESSAGE_STORAGE_KEY, JSON.stringify({
      version: 2,
      updatedAt: new Date(NOW - AI_LAB_RETENTION_MS).toISOString(),
      messages: [message(1)],
    }));

    expect(loadAiLabConversation(localStorage, NOW)).toEqual([]);
    expect(localStorage.getItem(AI_LAB_MESSAGE_STORAGE_KEY)).toBeNull();
  });

  it("clears only the AI Lab conversation key", () => {
    localStorage.setItem(AI_LAB_MESSAGE_STORAGE_KEY, "conversation");
    localStorage.setItem("kff_local_watchlist", "watchlist");
    clearAiLabConversation(localStorage);
    expect(localStorage.getItem(AI_LAB_MESSAGE_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem("kff_local_watchlist")).toBe("watchlist");
  });
});
