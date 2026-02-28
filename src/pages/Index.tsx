import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Calculator, BookOpen, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { funds } from "@/data/funds";

const Index = () => {
  const topFunds = [...funds].sort((a, b) => b.annualYield - a.annualYield).slice(0, 5);

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
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
              <Link to="/compare">Compare Funds <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/50 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 font-semibold">
              <Link to="/calculator">Calculate Returns</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Top Funds Preview */}
      <section className="container py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Top Performing Funds</h2>
          <p className="text-muted-foreground">Ranked by current annual effective yield</p>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block rounded-lg border border-border overflow-hidden">
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
                  <td className="px-4 py-3 text-right font-semibold text-accent">{fund.annualYield}%</td>
                  <td className="px-4 py-3 text-right">KES {fund.minimumInvestment.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/compare/${fund.id}`} className="text-accent hover:underline text-xs font-medium">
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {topFunds.map((fund) => (
            <Link
              key={fund.id}
              to={`/compare/${fund.id}`}
              className="block rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-sm">{fund.name}</h3>
                <span className="text-accent font-bold">{fund.annualYield}%</span>
              </div>
              <p className="text-xs text-muted-foreground">{fund.manager}</p>
              <p className="text-xs text-muted-foreground mt-1">Min: KES {fund.minimumInvestment.toLocaleString()}</p>
            </Link>
          ))}
        </div>

        <div className="text-center mt-6">
          <Button asChild variant="outline">
            <Link to="/compare">View All Funds <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* 3 Steps */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: BarChart3, title: "Compare", desc: "Browse and filter all CMA-regulated Money Market Funds side by side." },
              { icon: Calculator, title: "Calculate", desc: "Use our calculator to estimate your potential returns over any period." },
              { icon: TrendingUp, title: "Invest Smarter", desc: "Make informed decisions backed by real data and market insights." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                  <Icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is an MMF? */}
      <section className="container py-16">
        <div className="max-w-2xl mx-auto text-center">
          <BookOpen className="h-10 w-10 text-accent mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-4">What is a Money Market Fund?</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            A Money Market Fund is a collective investment scheme that pools money from investors to invest in short-term, low-risk instruments like Treasury bills, commercial paper, and fixed deposits. In Kenya, MMFs are regulated by the <strong className="text-foreground">Capital Markets Authority (CMA)</strong> and offer higher returns than traditional savings accounts — often between 14% to 17% annually — while keeping your money accessible.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            They're ideal for investors seeking a safe, liquid alternative to bank savings with significantly better returns.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/learn">Learn More <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
