import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useMarketData } from "@/components/home/MarketTicker";
import { RatesTable } from "@/components/home/MarketTicker";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const RatesPage = () => {
  useDocumentTitle(
    "FX Exchange Rates – Kenya Fund Finder",
    "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more."
  );

  const { rates, loading } = useMarketData();

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
          <h1 className="text-2xl font-bold text-foreground">FX Exchange Rates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Indicative exchange rates against the Kenya Shilling (KES). Updated manually by administrators.
          </p>
        </div>

        <RatesTable rates={rates} loading={loading} />
      </div>
    </div>
  );
};

export default RatesPage;
