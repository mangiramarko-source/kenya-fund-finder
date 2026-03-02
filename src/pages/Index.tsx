import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Calculator, Newspaper, BookOpen, TrendingUp, Shield, Zap, PiggyBank, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchFunds, fetchPublishedNews, type FundFromDB, type NewsFromDB } from "@/lib/api";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";

const Index = () => {
  useDocumentTitle("MMF Compare Kenya – Compare Money Market Funds", "Compare CMA-regulated Money Market Funds in Kenya. See yields, fees, and calculate returns.");
  useJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MMF Compare Kenya",
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

  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-primary-foreground py-20 md:py-28">
        <div className="container text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-4 py-1.5 text-sm font-medium text-accent-foreground/90 mb-6">
            <Shield className="h-4 w-4" />
            CMA Regulated Funds
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold max-w-3xl mx-auto leading-tight mb-4">
            Compare Money Market Funds in Kenya
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-xl mx-auto mb-8">
            See returns. Calculate earnings. Stay updated.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-full px-8">
              <Link to="/compare"><BarChart3 className="mr-2 h-4 w-4" /> Compare Funds</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/50 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 font-semibold rounded-full px-8">
              <Link to="/calculator"><Calculator className="mr-2 h-4 w-4" /> Calculate Returns</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/50 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 font-semibold rounded-full px-8 hidden sm:inline-flex">
              <Link to="/learn"><BookOpen className="mr-2 h-4 w-4" /> Learn</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Quick action cards */}
      <section className="container -mt-10 relative z-10 mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
          {[
            { icon: BarChart3, title: "Compare Funds", desc: "Side-by-side fund analysis", to: "/compare", color: "text-accent" },
            { icon: Calculator, title: "Calculator", desc: "Estimate your returns", to: "/calculator", color: "text-info" },
            { icon: Newspaper, title: "Latest News", desc: "Market updates & insights", to: "/news", color: "text-warning" },
          ].map(({ icon: Icon, title, desc, to, color }) => (
            <Link key={to} to={to} className="group flex items-center gap-4 rounded-2xl bg-card border border-border p-5 shadow-sm hover:shadow-md hover:border-accent/30 transition-all">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-muted group-hover:bg-accent/10 transition-colors shrink-0">
                <Icon className={`h-6 w-6 ${color} group-hover:text-accent transition-colors`} />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">{title}</h3>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Top Funds */}
      <section className="container py-12">
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

        {/* Desktop table */}
        <div className="hidden md:block rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="text-left px-4 py-3 font-semibold">Fund Name</th>
                <th className="text-left px-4 py-3 font-semibold">Manager</th>
                <th className="text-right px-4 py-3 font-semibold">Annual Yield</th>
                <th className="text-right px-4 py-3 font-semibold">Min. Investment</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {topFunds.map((fund, i) => (
                <tr key={fund.id} className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-muted/30"}`}>
                  <td className="px-4 py-3 font-medium">{fund.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fund.manager}</td>
                  <td className="px-4 py-3 text-right font-semibold text-accent">{fund.annual_yield}%</td>
                  <td className="px-4 py-3 text-right">KES {fund.minimum_investment.toLocaleString()}</td>
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
          {topFunds.map((fund) => (
            <Link key={fund.id} to={`/compare/${fund.slug}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-accent/30 transition-all">
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-accent/10 shrink-0">
                <PiggyBank className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">{fund.name}</h3>
                <p className="text-xs text-muted-foreground">{fund.manager}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-accent font-bold text-sm">{fund.annual_yield}%</span>
                <p className="text-[10px] text-muted-foreground">annual</p>
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
        <div className="container">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestNews.map((article) => (
              <article key={article.id} className="group rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-accent/30 transition-all">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {article.category}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{article.read_time}</span>
                </div>
                <h3 className="font-heading font-semibold text-sm mb-2 group-hover:text-accent transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{article.summary}</p>
                <span className="text-xs text-muted-foreground">
                  {article.source && `${article.source} · `}
                  {new Date(article.date_published).toLocaleDateString("en-KE", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3 Steps */}
      <section className="container py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
          {[
            { icon: BarChart3, title: "Compare", desc: "Browse and filter all CMA-regulated Money Market Funds side by side.", step: "1" },
            { icon: Calculator, title: "Calculate", desc: "Use our calculator to estimate your potential returns over any period.", step: "2" },
            { icon: Zap, title: "Invest Smarter", desc: "Make informed decisions backed by real data and market insights.", step: "3" },
          ].map(({ icon: Icon, title, desc, step }) => (
            <div key={title} className="text-center">
              <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
                <Icon className="h-7 w-7 text-accent" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">{step}</span>
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What is an MMF? */}
      <section className="bg-muted/40 py-16">
        <div className="container max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <BookOpen className="h-7 w-7 text-accent" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">What is a Money Market Fund?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A Money Market Fund is a collective investment scheme that pools money from investors to invest in short-term, low-risk instruments like Treasury bills, commercial paper, and fixed deposits. In Kenya, MMFs are regulated by the <strong className="text-foreground">Capital Markets Authority (CMA)</strong> and offer higher returns than traditional savings accounts while keeping your money accessible.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            They're ideal for investors seeking a safe, liquid alternative to bank savings with significantly better returns.
          </p>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link to="/learn"><GraduationCap className="mr-2 h-4 w-4" /> Learn More</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
