import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiLabChat from "./AiLabChat";
import type { AiLabChatMessage } from "@/lib/aiLab/chat";

vi.mock("@/components/ai-lab/ScenarioResult", () => ({ default: () => null }));

const message: AiLabChatMessage = {
  id: "assistant-1",
  role: "assistant",
  text: "Which KCB product do you mean?",
  createdAt: "2026-09-08T00:00:00.000Z",
  status: "clarifying",
  clarification: {
    kind: "entity-choice",
    question: "Which KCB product do you mean?",
    continuationToken: "uq1.test",
    originalQuery: "compare KCB",
    choices: [
      { id: "stock:kcb", kind: "stock", label: "KCB Group", description: "NSE · stock", sourceKey: "KCB" },
      { id: "fund:kcb-mmf", kind: "fund", subtype: "money_market", label: "KCB Money Market Fund", description: "money market · KCB Asset Management", sourceKey: "kcb-mmf" },
    ],
  },
};

describe("AiLabChat clarification choices", () => {
  it("submits stable entity IDs rather than reparsing labels", () => {
    const select = vi.fn();
    render(
      <AiLabChat
        messages={[message]}
        onSubmit={vi.fn()}
        compareStateByMessageId={{}}
        onLookbackChange={vi.fn()}
        onClarificationSelect={select}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /KCB Group/i }));
    expect(select).toHaveBeenCalledWith("assistant-1", "stock:kcb");
    expect(screen.queryByText("Was this helpful?")).not.toBeInTheDocument();
  });
});
