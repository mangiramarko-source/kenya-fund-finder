import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";
import { useMarketData } from "@/components/home/MarketTicker";
import { RatesTable } from "@/components/home/MarketTicker";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const RatesPage = () => {
  useDocumentTitle(
    "FX Exchange Rates – Kenya Fund Finder",
    "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more.",
    {
      title: "FX Exchange Rates – Kenya Fund Finder",
      description: "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more.",
    }
  );
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "FX Exchange Rates – Kenya Fund Finder",
    description: "Live foreign exchange rates against the Kenya Shilling. Track USD, EUR, GBP and more.",
    url: "https://kenyafundfinder.com/rates",
  });

  const { rates, loading } = useMarketData();

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
            <div className="flex items-center justify-center h-8 w-8 rounded-lg" style={{ background: 'hsl(var(--cat-fx) / 0.12)' }}>
              <ArrowLeft className="h-4 w-4 rotate-180" style={{ color: 'hsl(var(--cat-fx))' }} />
            </div>
            <h1 className="text-xl font-bold text-foreground">FX Exchange Rates</h1>
          </div>
          <p className="text-xs text-muted-foreground ml-10">
            Indicative exchange rates against the Kenya Shilling (KES). Updated manually by administrators.
          </p>
        </div>

        <RatesTable rates={rates} loading={loading} />
      </div>
    </div>
  );
};

export default RatesPage;
