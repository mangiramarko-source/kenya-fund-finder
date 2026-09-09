import { useCallback, useEffect, useRef, useState } from "react";
import type { AiLabChatMessage } from "@/lib/aiLab/chat";
import {
  clearAiLabConversation,
  loadAiLabConversation,
  saveAiLabConversation,
} from "@/lib/aiLab/conversationStorage";

export function useAiLabConversationStorage() {
  const [messages, setMessages] = useState<AiLabChatMessage[]>(loadAiLabConversation);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    saveAiLabConversation(messages);
  }, [messages]);

  const clearMessages = useCallback(() => {
    clearAiLabConversation();
    setMessages([]);
  }, []);

  return { messages, setMessages, clearMessages };
}
