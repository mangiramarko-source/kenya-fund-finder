import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useMarketData } from "@/components/home/MarketTicker";
import { CommoditiesTable } from "@/components/home/MarketTicker";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const CommoditiesPage = () => {
  useDocumentTitle(
    "Commodity Prices – Kenya Fund Finder",
    "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly.",
    {
      title: "Commodity Prices – Kenya Fund Finder",
      description: "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly.",
    }
  );
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Commodity Prices – Kenya Fund Finder",
    description: "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly.",
    url: "https://kenyafundfinder.com/commodities",
  });

  const { commodities, loading } = useMarketData();

  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl py-6">
        <div className="mb-5">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="h-3 w-3" /> Home
          </Link>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: 'hsl(var(--cat-commodities) / 0.12)' }}>
              <ArrowLeft className="h-4 w-4 rotate-180" style={{ color: 'hsl(var(--cat-commodities))' }} />
            </div>
            <h1 className="text-xl font-bold text-foreground">Commodity Prices</h1>
          </div>
          <p className="text-xs text-muted-foreground ml-10">
            Indicative commodity prices. Updated manually by administrators.
          </p>
        </div>

        <CommoditiesTable commodities={commodities} loading={loading} />
      </div>
    </div>
  );
};

export default CommoditiesPage;
