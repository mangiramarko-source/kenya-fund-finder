import type { AiLabChatMessage } from "@/lib/aiLab/chat";

export const AI_LAB_MESSAGE_STORAGE_KEY = "ai-lab-messages-v1";
export const AI_LAB_MESSAGE_LIMIT = 50;
export const AI_LAB_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

const STORAGE_VERSION = 2;

type AiLabConversationEnvelope = {
  version: typeof STORAGE_VERSION;
  updatedAt: string;
  messages: AiLabChatMessage[];
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isPersistableMessage(value: unknown): value is AiLabChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<AiLabChatMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.text === "string" &&
    typeof message.createdAt === "string" &&
    message.status !== "pending"
  );
}

export function loadAiLabConversation(
  storage: StorageLike | null = browserStorage(),
  now = Date.now(),
): AiLabChatMessage[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(AI_LAB_MESSAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      storage.removeItem(AI_LAB_MESSAGE_STORAGE_KEY);
      return [];
    }

    const envelope = parsed as Partial<AiLabConversationEnvelope>;
    const updatedAt = typeof envelope.updatedAt === "string" ? Date.parse(envelope.updatedAt) : Number.NaN;
    if (
      envelope.version !== STORAGE_VERSION ||
      !Array.isArray(envelope.messages) ||
      !Number.isFinite(updatedAt) ||
      updatedAt > now ||
      now - updatedAt >= AI_LAB_RETENTION_MS
    ) {
      storage.removeItem(AI_LAB_MESSAGE_STORAGE_KEY);
      return [];
    }

    const settledMessages = envelope.messages.filter((message) => (
      !message || typeof message !== "object" || (message as Partial<AiLabChatMessage>).status !== "pending"
    ));
    if (!settledMessages.every(isPersistableMessage)) {
      storage.removeItem(AI_LAB_MESSAGE_STORAGE_KEY);
      return [];
    }
    return settledMessages.slice(-AI_LAB_MESSAGE_LIMIT);
  } catch {
    try {
      storage.removeItem(AI_LAB_MESSAGE_STORAGE_KEY);
    } catch {
      // Storage may be unavailable in private or restricted browsing modes.
    }
    return [];
  }
}

export function saveAiLabConversation(
  messages: AiLabChatMessage[],
  storage: StorageLike | null = browserStorage(),
  now = Date.now(),
): void {
  if (!storage) return;
  try {
    const bounded = messages.filter((message) => message.status !== "pending").slice(-AI_LAB_MESSAGE_LIMIT);
    if (bounded.length === 0) {
      storage.removeItem(AI_LAB_MESSAGE_STORAGE_KEY);
      return;
    }
    const envelope: AiLabConversationEnvelope = {
      version: STORAGE_VERSION,
      updatedAt: new Date(now).toISOString(),
      messages: bounded,
    };
    storage.setItem(AI_LAB_MESSAGE_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore quota, serialization, and restricted-storage failures.
  }
}

export function clearAiLabConversation(storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(AI_LAB_MESSAGE_STORAGE_KEY);
  } catch {
    // Ignore restricted-storage failures.
  }
}
