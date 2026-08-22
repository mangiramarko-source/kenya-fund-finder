import React from "react";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { type NewsFromDB } from "@/lib/api";
import { InvestorBriefing } from "./InvestorBriefing";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";

interface FxDecisionContextProps {
  item?: FeedItem;
  article?: NewsFromDB | any;
  fx?: any;
  onEnrichmentComplete?: (updatedArticle: any) => void;
  onReadMore?: () => void;
}

export function FxDecisionContext({
  item,
  article,
  fx,
}: FxDecisionContextProps) {
  const art = (article || item?.rawItem) as NewsFromDB;
  if (!art) return null;

  const briefing = buildInvestorBriefing(art, {
    fx: fx || item?.relatedFx,
  });

  return (
    <div className="mt-4 font-sans text-foreground">
      <InvestorBriefing briefing={briefing} />
    </div>
  );
}
