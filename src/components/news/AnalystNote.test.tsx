import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnalystNote } from "./AnalystNote";

describe("AnalystNote", () => {
  it("renders structured narrative without repeating legacy content or fallback rows", () => {
    render(
      <AnalystNote
        analysis={{
          content: "Legacy summary that should not appear.",
          analyst_summary: "Safaricom changed the availability of a data bundle.",
          investment_context: "The change may affect usage and revenue per customer.",
          key_uncertainty: "Customer response is not yet known.",
          narrative_sections: [
            {
              heading: "What changed",
              body: "Safaricom changed the availability of a data bundle.",
            },
            {
              heading: "Why investors may care",
              body: "The change may affect usage and revenue per customer.",
            },
            {
              heading: "What remains uncertain",
              body: "Customer response is not yet known.",
            },
          ],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "What changed" })).toBeInTheDocument();
    expect(screen.getByText("Safaricom changed the availability of a data bundle.")).toBeInTheDocument();
    expect(screen.queryByText("Legacy summary that should not appear.")).not.toBeInTheDocument();
    expect(screen.queryByText(/Story so far:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Market connection:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Investor lens:/)).not.toBeInTheDocument();
  });

  it("preserves legacy content when structured narrative is unavailable", () => {
    render(
      <AnalystNote
        analysis={{
          content: "A source-grounded explanation for an older article.",
        }}
      />,
    );

    expect(screen.getByText("A source-grounded explanation for an older article.")).toBeInTheDocument();
  });
});
