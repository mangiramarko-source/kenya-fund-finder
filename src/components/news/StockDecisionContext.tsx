import React from "react";
import { type NewsFromDB, type PublicStock } from "@/lib/api";
import { InvestorBriefing } from "./InvestorBriefing";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";

interface StockDecisionContextProps {
  article: NewsFromDB;
  stock: PublicStock;
  inlineTransparent?: boolean;
  onReadMore?: () => void;
  onEnrichmentComplete?: (updatedArticle: NewsFromDB) => void;
}

export function StockDecisionContext({
  article,
  stock,
  inlineTransparent,
}: StockDecisionContextProps) {
  const briefing = buildInvestorBriefing(article, { stock });

  return (
    <div className="mt-4 font-sans text-foreground">
      <InvestorBriefing briefing={briefing} inlineTransparent={inlineTransparent} />
    </div>
  );
}
