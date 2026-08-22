import React from "react";
import { type FeedItem } from "@/hooks/useSocialFeed";
import { type NewsFromDB } from "@/lib/api";
import { InvestorBriefing } from "./InvestorBriefing";
import { buildInvestorBriefing } from "@/lib/newsBriefingMapper";

interface MmfDecisionContextProps {
  item?: FeedItem;
  article?: NewsFromDB | any;
  mmf?: any;
  onEnrichmentComplete?: (updatedArticle: any) => void;
  onReadMore?: () => void;
}

export function MmfDecisionContext({
  item,
  article,
  mmf,
}: MmfDecisionContextProps) {
  const art = (article || item?.rawItem) as NewsFromDB;
  if (!art) return null;

  const briefing = buildInvestorBriefing(art, {
    mmf: mmf || item?.relatedMmf,
  });

  return (
    <div className="mt-4 font-sans text-foreground">
      <InvestorBriefing briefing={briefing} />
    </div>
  );
}
