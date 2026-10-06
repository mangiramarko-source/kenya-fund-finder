import { useQuery } from "@tanstack/react-query";
import ResearchContent from "@/components/ResearchContent";
import { fetchPublicData } from "@/lib/gateway";
import { mmfHubSeo, type ResearchFund } from "@/lib/seoMarketContent";

export default function MmfResearchPage() {
  const { data = [], isPending, isError, refetch } = useQuery({
    queryKey: ["mmf-research"],
    queryFn: async () => (await fetchPublicData<ResearchFund>("funds", { select: ["slug", "name", "manager", "fund_type", "annual_yield", "yield_unit", "management_fee", "minimum_investment", "withdrawal_time", "updated_at", "fact_sheet_date", "website"], filters: { fund_type: "money_market" }, limit: 200, order: "name.asc" })).data,
    staleTime: 300_000,
  });
  const page = mmfHubSeo(data);
  if (isPending) page.contentHtml = page.contentHtml.replace("Fund data is temporarily unavailable. Use the fund directory and confirm terms directly with the manager.", "Published comparison figures will appear here once loaded.");
  return <ResearchContent page={page}>
    {isPending && <p role="status" className="mb-4 text-sm text-muted-foreground">Loading published fund information…</p>}
    {isError && <button type="button" onClick={() => void refetch()} className="mb-4 rounded-full border border-border px-4 py-2 text-sm">Retry fund data</button>}
  </ResearchContent>;
}
