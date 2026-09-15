import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
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
      <MemoryRouter>
        <AiLabChat
          messages={[message]}
          onSubmit={vi.fn()}
          compareStateByMessageId={{}}
          onLookbackChange={vi.fn()}
          onClarificationSelect={select}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /KCB Group/i }));
    expect(select).toHaveBeenCalledWith("assistant-1", "stock:kcb");
    expect(screen.queryByText("Was this helpful?")).not.toBeInTheDocument();
  });

  it("renders safe internal beginner-learning links", () => {
    const beginnerMessage: AiLabChatMessage = {
      id: "assistant-beginner",
      role: "assistant",
      text: "Start with the basic investment words.",
      createdAt: "2026-09-10T00:00:00.000Z",
      status: "answered",
      followUps: ["What is a stock?", "What is an MMF?", "Explain risk", "Explain dividend"],
      actions: [
        { label: "Open Learn", to: "/learn" },
        { label: "Explore Stocks", to: "/stocks" },
        { label: "Explore MMFs", to: "/funds" },
      ],
    };

    render(
      <MemoryRouter>
        <AiLabChat
          messages={[beginnerMessage]}
          onSubmit={vi.fn()}
          compareStateByMessageId={{}}
          onLookbackChange={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation", { name: "Explore KenyaFundFinder" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Learn" })).toHaveAttribute("href", "/learn");
    expect(screen.getByRole("link", { name: "Explore Stocks" })).toHaveAttribute("href", "/stocks");
    expect(screen.getByRole("link", { name: "Explore MMFs" })).toHaveAttribute("href", "/funds");
    expect(screen.getAllByRole("button", { name: "What is a stock?" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "What is an MMF?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explain risk" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Explain dividend" })).toBeInTheDocument();
  });
});
