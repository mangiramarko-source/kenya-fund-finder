import React from "react";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { type NewsFromDB } from "@/lib/api";
import { InvestorBriefing } from "./InvestorBriefing";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";

interface CommodityDecisionContextProps {
  item?: FeedItem;
  article?: NewsFromDB | any;
  commodity?: any;
  onEnrichmentComplete?: (updatedArticle: any) => void;
  onReadMore?: () => void;
}

export function CommodityDecisionContext({
  item,
  article,
  commodity,
}: CommodityDecisionContextProps) {
  const art = (article || item?.rawItem) as NewsFromDB;
  if (!art) return null;

  const briefing = buildInvestorBriefing(art, {
    commodity: commodity || item?.relatedCommodity,
  });

  return (
    <div className="mt-4 font-sans text-foreground">
      <InvestorBriefing briefing={briefing} />
    </div>
  );
}
