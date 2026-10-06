import { RESEARCH_ARTICLES, articlePath } from "@/data/seoGrowthContent";

export default function ResearchLinks({ pillar }: { pillar: "stocks" | "mmf" | "trust" | "all" }) {
  const articles = RESEARCH_ARTICLES.filter(a => pillar === "all" || a.pillar === pillar);
  return <section aria-label="Research guides and sources" className="my-6 rounded-2xl border border-border bg-card p-5">
    <h2 className="text-base font-semibold">{pillar === "trust" ? "Standards and sources" : "Research before investing"}</h2>
    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3 text-sm">
      <a href="/money-market-funds-kenya" className="text-emerald-600 dark:text-emerald-400 hover:underline">Compare Kenyan MMFs</a>
      <a href="/mmf-calculator" className="text-emerald-600 dark:text-emerald-400 hover:underline">Kenya MMF calculator</a>
      {articles.map(a => <a key={a.slug} href={articlePath(a)} className="text-muted-foreground hover:text-foreground hover:underline">{a.title}</a>)}
    </div>
  </section>;
}
