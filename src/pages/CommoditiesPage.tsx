import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMarketData } from "@/components/home/MarketTicker";
import { CommoditiesTable } from "@/components/home/MarketTicker";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const CommoditiesPage = () => {
  useDocumentTitle(
    "Commodity Prices – Kenya Fund Finder",
    "Track gold, oil, and cryptocurrency prices. Indicative commodity pricing updated regularly."
  );

  const { commodities, loading } = useMarketData();

  return (
    <div className="min-h-screen">
      <div className="container max-w-4xl py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Commodity Prices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indicative commodity prices. Updated manually by administrators.
          </p>
        </div>

        <CommoditiesTable commodities={commodities} loading={loading} />
      </div>
    </div>
  );
};

export default CommoditiesPage;
