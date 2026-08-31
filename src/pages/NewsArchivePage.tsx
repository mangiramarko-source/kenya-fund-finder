import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Archive, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLoadingGate from "@/components/PageLoadingGate";
import { supabase } from "@/integrations/supabase/client";
import { isIndexableNewsArticle } from "@/lib/seoNewsEligibility";
import {
  getNewsArchivePage,
  getNewsArchivePageCount,
  getNewsArchivePath,
} from "@/lib/newsArchive";

interface ArchiveArticle {
  id: string;
  title: string;
  summary: string;
  source: string | null;
  category: string | null;
  status: string | null;
  source_published_at: string | null;
  date_published: string | null;
  created_at: string | null;
}

function publishedDate(article: ArchiveArticle): string {
  const value = article.source_published_at || article.date_published || article.created_at;
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function NewsArchivePage() {
  const { page: pageParam } = useParams<{ page?: string }>();
  const page = pageParam ? Number(pageParam) : 1;
  const validPage = Number.isInteger(page) && page > 0;
  const [articles, setArticles] = useState<ArchiveArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(
    validPage && page > 1
      ? `Kenya Market News Archive – Page ${page} | Kenya Fund Finder`
      : "Kenya Market News Archive | Kenya Fund Finder",
    "Browse the complete Kenya Fund Finder archive of Kenyan markets, NSE stocks, money market funds, FX, commodities, business, and economy news.",
    {
      title: validPage && page > 1 ? `Kenya Market News Archive – Page ${page}` : "Kenya Market News Archive",
      description: "Browse the complete archive of Kenyan market and investment news.",
    },
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    supabase
      .from("news_articles_public")
      .select("id,title,summary,source,category,status,source_published_at,date_published,created_at")
      .eq("status", "published")
      .order("source_published_at", { ascending: false, nullsFirst: false })
      .order("date_published", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) {
          setError("The news archive could not be loaded. Please try again shortly.");
        } else {
          setArticles(((data || []) as ArchiveArticle[]).filter(isIndexableNewsArticle));
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const pageCount = getNewsArchivePageCount(articles.length);
  const pageArticles = useMemo(
    () => (validPage ? getNewsArchivePage(articles, page) : []),
    [articles, page, validPage],
  );

  if (!validPage) return <Navigate to="/news/archive" replace />;
  if (!loading && !error && page > pageCount) return <Navigate to={getNewsArchivePath(pageCount)} replace />;

  return (
    <PageLoadingGate isReady={!loading} message="Loading news archive…" resetKey={page} loaderClassName="min-h-screen">
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <Link to="/news" className="hover:text-foreground">Market News</Link>
        <span aria-hidden="true" className="mx-2">/</span>
        <span aria-current="page">Archive</span>
      </nav>

      <header className="mb-8 rounded-2xl border border-border bg-card p-6 md:p-8">
        <div className="mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <Archive className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Complete archive</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Kenya market news archive</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          Browse every news article that meets our public indexing standard. Use current market data and original publisher links to verify time-sensitive information before making a decision.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">{error}</div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page <strong className="text-foreground">{page}</strong> of {pageCount} · {articles.length} indexed articles
            </p>
            <Link to="/news" className="text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              Latest news
            </Link>
          </div>

          <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {pageArticles.map((article) => (
              <li key={article.id} className="p-5 transition-colors hover:bg-muted/35 md:p-6">
                <Link to={`/news/${article.id}`} className="group block">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{publishedDate(article)}</span>
                    {article.source && <span>{article.source}</span>}
                    {article.category && <span className="rounded-full bg-muted px-2 py-0.5">{article.category}</span>}
                  </div>
                  <h2 className="text-lg font-bold leading-snug text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                    {article.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{article.summary}</p>
                </Link>
              </li>
            ))}
          </ol>

          <nav aria-label="News archive pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Link to={getNewsArchivePath(page - 1)} className="inline-flex h-10 items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Link>
            )}
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((archivePage) => (
              <Link
                key={archivePage}
                to={getNewsArchivePath(archivePage)}
                aria-current={archivePage === page ? "page" : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold ${
                  archivePage === page
                    ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600"
                    : "border-border hover:bg-muted"
                }`}
              >
                {archivePage}
              </Link>
            ))}
            {page < pageCount && (
              <Link to={getNewsArchivePath(page + 1)} className="inline-flex h-10 items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted">
                Next <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </nav>
        </>
      )}
    </main>
    </PageLoadingGate>
  );
}
