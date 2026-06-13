import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Database, FileText, Clock } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import DisclaimerBlock from "@/components/DisclaimerBlock";
import { fetchFunds, type FundFromDB } from "@/lib/api";

export interface DataViewPageProps {
  title: string;
  intro: string;
  methodology: string;
  seoTitle: string;
  seoDescription: string;
  /** Render the data using the funds list. */
  children: (funds: FundFromDB[]) => React.ReactNode;
  /** Optional pre-filter applied before passing funds to `children`. */
  filter?: (fund: FundFromDB) => boolean;
}

const DataViewPage = ({
  title, intro, methodology, seoTitle, seoDescription, children, filter,
}: DataViewPageProps) => {
  useDocumentTitle(seoTitle, seoDescription);

  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFunds()
      .then((rows) => {
        if (cancelled) return;
        setFunds(rows.filter((f) => f.is_published));
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load fund data.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = filter ? funds.filter(filter) : funds;
  const lastUpdated = funds.length
    ? new Date(Math.max(...funds.map((f) => new Date(f.updated_at).getTime())))
    : null;

  return (
    <div className="container max-w-5xl py-4 md:py-6 px-4 md:px-6 space-y-5">
      <nav className="flex items-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
        <span className="text-muted-foreground/40 text-xs">/</span>
        <span className="text-xs text-muted-foreground">Fund views</span>
      </nav>

      <header className="space-y-1.5">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">{intro}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last updated{" "}
            {lastUpdated
              ? lastUpdated.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
              : "—"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Database className="h-3 w-3" />
            Data sourced from public fund-manager fact sheets and the CMA register.
          </span>
        </div>
      </header>

      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <FileText className="inline h-3 w-3 mr-1 -mt-0.5 text-muted-foreground/70" />
          <strong className="text-foreground/80">Methodology:</strong> {methodology}
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading data…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No funds match this view yet.
        </div>
      ) : (
        children(visible)
      )}

      <DisclaimerBlock />
    </div>
  );
};

export default DataViewPage;
