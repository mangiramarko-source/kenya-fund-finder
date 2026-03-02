import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Calculator, Newspaper, BookOpen, TrendingUp, Shield, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchFunds, fetchPublishedNews, type FundFromDB, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";

const Index = () => {
  useDocumentTitle("Fund Finder Kenya – Compare Money Market Funds", "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.");
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Fund Finder Kenya",
    url: "https://kenyafundfinder.com",
    description: "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kenyafundfinder.com/compare?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  });
  const [funds, setFunds] = useState<FundFromDB[]>([]);
  const [news, setNews] = useState<NewsFromDB[]>([]);

  useEffect(() => {
    fetchFunds().then((data) => setFunds(data)).catch(() => {});
    fetchPublishedNews().then((data) => setNews(data)).catch(() => {});
  }, []);

  const topFunds = funds.slice(0, 5);
  const latestNews = news.slice(0, 3);

  const bestYield = useMemo(() => {
    if (topFunds.length === 0) return 0;
    return Math.max(...topFunds.map((f) => f.annual_yield));
  }, [topFunds]);

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-primary-foreground py-20 md:py-28 lg:py-36">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 border border-accent/20 px-4 py-1.5 text-sm font-medium text-accent mb-8">
                <Shield className="h-4 w-4" />
                CMA Regulated Funds
              </div>
              <h1 className="text-3xl md:text-5xl lg:text-[3.5rem] xl:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
                Compare Unit Trusts in Kenya
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/70 max-w-lg mx-auto lg:mx-0 mb-10">
                See returns. Calculate earnings. Stay updated.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-full px-8">
                  <Link to="/compare"><BarChart3 className="mr-2 h-4 w-4" /> Compare Funds</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/5 hover:bg-primary-foreground/15 font-semibold rounded-full px-8">
                  <Link to="/calculator"><Calculator className="mr-2 h-4 w-4" /> Calculate Returns</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground bg-primary-foreground/5 hover:bg-primary-foreground/15 font-semibold rounded-full px-8 hidden sm:inline-flex">
                  <Link to="/learn"><BookOpen className="mr-2 h-4 w-4" /> Learn</Link>
                </Button>
              </div>
            </div>
            {/* Hero stats — visible on lg+ */}
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {[
                { label: "Unit Trusts Tracked", value: funds.length || "—", sub: "CMA regulated", highlight: false },
                { label: "Top Yield", value: bestYield ? `${bestYield}%` : "—", sub: "annual rate", highlight: true },
                { label: "Latest Update", value: funds[0] ? new Date(funds[0].updated_at).toLocaleDateString("en-KE", { month: "short", day: "numeric" }) : "—", sub: "data refresh", highlight: false },
                { label: "Market News", value: news.length || "—", sub: "latest insights", highlight: false },
              ].map(({ label, value, sub, highlight }) => (
                <div key={label} className={`rounded-2xl backdrop-blur-md border p-6 text-center transition-all hover:scale-[1.02] ${highlight ? "bg-accent/15 border-accent/30" : "bg-primary-foreground/[0.07] border-primary-foreground/10"}`}>
                  <p className="text-3xl xl:text-4xl font-bold text-accent mb-2 tabular-nums">{value}</p>
                  <p className="text-sm font-semibold text-primary-foreground/90">{label}</p>
                  <p className="text-xs text-primary-foreground/50 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Top Funds */}
      <section className="container max-w-6xl -mt-10 relative z-10 pt-16 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent/10">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Top Performing Funds</h2>
              <p className="text-xs text-muted-foreground">Ranked by annual effective yield</p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full hidden sm:inline-flex">
            <Link to="/compare">View All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>

        {/* Desktop/Tablet table */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 py-3 font-semibold w-8">#</th>
                <th className="text-left px-4 py-3 font-semibold">Fund Name</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Manager</th>
                <th className="text-right px-4 py-3 font-semibold">Annual Rate</th>
                <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell w-40">Yield</th>
                <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">Min. Investment</th>
                <th className="text-right px-4 py-3 font-semibold">Mgmt Fee</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {topFunds.map((fund, i) => (
                <tr key={fund.id} className={`border-t border-border hover:bg-muted/50 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-muted/20"}`}>
                  <td className="px-4 py-3 text-muted-foreground font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fund.name}</span>
                      {fund.annual_yield === bestYield && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-accent text-accent-foreground">Top</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground lg:hidden">{fund.manager}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{fund.manager}</td>
                  <td className="px-4 py-3 text-right font-bold text-accent">{fund.annual_yield}%</td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent/70"
                          style={{ width: `${bestYield > 0 ? (fund.annual_yield / bestYield) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell">KES {fund.minimum_investment.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{fund.management_fee}%</td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm" className="text-accent h-8 text-xs">
                      <Link to={`/compare/${fund.slug}`}>Details <ArrowRight className="ml-1 h-3 w-3" /></Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {topFunds.map((fund, i) => (
            <Link key={fund.id} to={`/compare/${fund.slug}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-accent/30 transition-all">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/10 shrink-0">
                <span className="text-sm font-bold text-accent">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{fund.name}</h3>
                <p className="text-xs text-muted-foreground">{fund.manager}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-accent font-bold text-sm">{fund.annual_yield}%</span>
                <p className="text-[10px] text-muted-foreground">annual rate</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-4 sm:hidden">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/compare">View All Funds <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </section>

      {/* Latest News preview */}
      <section className="bg-muted/40 py-12">
        <div className="container max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-warning/10">
                <Newspaper className="h-5 w-5 text-warning" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold">Latest News</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-accent rounded-full">
              <Link to="/news">See All <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {latestNews.map((article, i) => (
              <article key={article.id} className={`group rounded-xl border border-border bg-card p-5 md:p-6 hover:shadow-md hover:border-accent/30 transition-all ${i === 0 ? "md:row-span-1" : ""}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {article.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{article.read_time}</span>
                </div>
                <h3 className="font-heading font-semibold text-sm md:text-base mb-2 group-hover:text-accent transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 mb-3">{article.summary}</p>
                <span className="text-xs text-muted-foreground">
                  {article.source && `${article.source} · `}
                  {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>



      {/* What is an MMF? */}
      <section className="bg-muted/40 py-16">
        <div className="container max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            <div className="lg:col-span-3 text-center lg:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">What is a Money Market Fund?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A Money Market Fund is a collective investment scheme that pools money from investors to invest in short-term, low-risk instruments like Treasury bills, commercial paper, and fixed deposits. In Kenya, MMFs are regulated by the <strong className="text-foreground">Capital Markets Authority (CMA)</strong> and offer higher returns than traditional savings accounts while keeping your money accessible.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                They're ideal for investors seeking a safe, liquid alternative to bank savings with significantly better returns.
              </p>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/learn"><GraduationCap className="mr-2 h-4 w-4" /> Learn More</Link>
              </Button>
            </div>
            <div className="lg:col-span-2 hidden lg:grid grid-cols-2 gap-3">
              {[
                { label: "Low Risk", desc: "Government-backed instruments" },
                { label: "High Liquidity", desc: "Access funds within days" },
                { label: "Better Returns", desc: "Outperform savings accounts" },
                { label: "CMA Regulated", desc: "Investor protection" },
              ].map(({ label, desc }) => (
                <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
                  <p className="font-semibold text-sm mb-1">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
