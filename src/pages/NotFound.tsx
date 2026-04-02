import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Home, Search, TrendingUp, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  useDocumentTitle("Page Not Found – Kenya Fund Finder", "The page you're looking for doesn't exist. Browse unit trusts, stocks, FX rates, and commodities on Kenya Fund Finder.");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-2">Page Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved. Try one of these instead:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="default" className="gap-2">
            <Link to="/"><Home className="h-4 w-4" /> Home</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/funds"><TrendingUp className="h-4 w-4" /> Unit Trusts</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/stocks"><Search className="h-4 w-4" /> Stocks</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/learn"><BookOpen className="h-4 w-4" /> Learn</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
