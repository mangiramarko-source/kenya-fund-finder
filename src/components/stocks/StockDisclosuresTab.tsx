import { useEffect, useState } from "react";
import { CalendarDays, ExternalLink, FileText, ShieldCheck } from "lucide-react";
import { fetchPublicData } from "@/lib/gateway";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams } from "react-router-dom";

interface Disclosure {
  id: string;
  title: string;
  disclosure_type: string;
  published_at: string;
  summary: string | null;
  key_facts: unknown;
  source_url: string;
  source_domain: string;
}

interface CorporateAction {
  id: string;
  action_type: string;
  announcement_date: string;
  ex_date: string | null;
  book_closure_date: string | null;
  payment_date: string | null;
  amount: number | null;
  currency: string | null;
  ratio: string | null;
  source_url: string;
}

const label = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value: string | null) => value ? new Date(value).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

export function StockDisclosuresTab({ stockId }: { stockId: string }) {
  const [searchParams] = useSearchParams();
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [actions, setActions] = useState<CorporateAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchPublicData<Disclosure>("stock-disclosures", { id: stockId, limit: 50 }),
      fetchPublicData<CorporateAction>("stock-actions", { id: stockId, limit: 50 }),
    ]).then(([disclosureResponse, actionResponse]) => {
      if (!cancelled) {
        setDisclosures(disclosureResponse.data);
        setActions(actionResponse.data);
      }
    }).catch((error) => console.error("Failed to load stock disclosures", error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [stockId]);

  if (loading) return <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div>;

  const showLocalPreview = import.meta.env.DEV && searchParams.get("disclosuresDemo") === "1";
  const visibleDisclosures = showLocalPreview && disclosures.length === 0 ? [{
    id: "local-preview",
    title: "Safaricom FY25 Results Presentation",
    disclosure_type: "financial_results",
    published_at: "2025-05-09T00:00:00Z",
    summary: "Safaricom’s official results presentation covering the company’s full-year performance, operating highlights, and outlook.",
    key_facts: [],
    source_url: "https://www.safaricom.co.ke/investor-relations-landing/reports/financial-report/financial-results",
    source_domain: "safaricom.co.ke",
  }] : disclosures;

  if (!visibleDisclosures.length && !actions.length) {
    return (
      <div className="rounded-[28px] border border-border bg-card px-5 py-14 text-center shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:shadow-none">
        <FileText className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
        <h3 className="text-sm font-semibold">No issuer disclosures yet</h3>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
          Verified filings and corporate actions from this company’s official investor-relations sources will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actions.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-primary" /> Corporate actions</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {actions.map((action) => (
              <a key={action.id} href={action.source_url} target="_blank" rel="noopener noreferrer" className="rounded-[24px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] transition-colors hover:border-primary/40 md:rounded-xl md:p-4 md:shadow-none">
                <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold text-primary">{label(action.action_type)}</span><ExternalLink className="h-3.5 w-3.5 text-muted-foreground" /></div>
                <p className="mt-2 text-sm font-semibold">{action.amount != null ? `${action.currency || "KSh"} ${Number(action.amount).toLocaleString("en-KE")}` : action.ratio || "Issuer announcement"}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <span>Announced: {date(action.announcement_date)}</span><span>Ex-date: {date(action.ex_date)}</span>
                  <span>Book close: {date(action.book_closure_date)}</span><span>Payment: {date(action.payment_date)}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {visibleDisclosures.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> Latest filings</h3>
          <div className="space-y-3">
            {visibleDisclosures.map((item) => (
              <article key={item.id} className="rounded-[24px] border border-border bg-card p-5 shadow-[0_10px_28px_hsl(var(--foreground)/0.07)] md:rounded-xl md:p-4 md:shadow-none">
                <div className="flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">{label(item.disclosure_type)}</span><span className="text-muted-foreground">{date(item.published_at)}</span><span className="ml-auto inline-flex items-center gap-1 text-emerald-500"><ShieldCheck className="h-3.5 w-3.5" /> {item.id === "local-preview" ? "Local preview" : "Verified issuer source"}</span></div>
                <h4 className="mt-3 text-sm font-semibold leading-snug">{item.title}</h4>
                {item.summary && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>}
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">Open original on {item.source_domain}<ExternalLink className="h-3.5 w-3.5" /></a>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
