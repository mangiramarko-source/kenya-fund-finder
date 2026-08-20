import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { ArrowRight, BookOpen, Compass, Home, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  useDocumentTitle("Page Not Found – Kenya Fund Finder", "The page you're looking for doesn't exist. Browse unit trusts, stocks, FX rates, and commodities on Kenya Fund Finder.");

  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-12 sm:py-16">
      <section aria-labelledby="not-found-title" className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/40 px-6 py-8 text-center sm:px-10 sm:py-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold tracking-wide text-primary">KENYA FUND FINDER</p>
          <h1 id="not-found-title" className="mt-2 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Page not found
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            The page may have moved, its link may be outdated, or the address may be misspelled. Let&apos;s get you back to useful market information.
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <Button asChild className="w-full gap-2 sm:w-auto">
            <Link to="/">
              <Home className="h-4 w-4" aria-hidden="true" />
              Return to homepage
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          <nav aria-label="Popular destinations" className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link to="/funds" className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="mt-3 block text-sm font-semibold text-foreground">Compare unit trusts</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Explore CMA-regulated fund yields and fees.</span>
            </Link>
            <Link to="/stocks" className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="mt-3 block text-sm font-semibold text-foreground">Browse NSE stocks</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">See listed companies and market activity.</span>
            </Link>
            <Link to="/learn" className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="mt-3 block text-sm font-semibold text-foreground">Learn to invest</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">Start with clear guides for Kenyan investors.</span>
            </Link>
          </nav>
        </div>
      </section>
    </div>
  );
};

export default NotFound;
