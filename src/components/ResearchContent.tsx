import type { SeoPageDefinition } from "@/lib/seoPrerender";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";

/** Only trusted, escaped content from the shared SEO builders is accepted. */
export default function ResearchContent({ page, children }: { page: SeoPageDefinition; children?: React.ReactNode }) {
  useDocumentTitle(page.title, page.description, { title: page.title, description: page.description, type: page.type });
  useJsonLd({ "@context": "https://schema.org", "@graph": Array.isArray(page.jsonLd) ? page.jsonLd : [page.jsonLd].filter(Boolean) });
  return <article className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted-foreground"><a href="/" className="hover:text-foreground">Home</a> / <a href="/learn" className="hover:text-foreground">Research and learning</a></nav>
    <header className="mb-8"><h1 className="text-2xl font-bold tracking-tight md:text-4xl">{page.heading}</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{page.description}</p></header>
    {children}
    <div className="prose prose-sm max-w-none dark:prose-invert prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-headings:font-semibold prose-h2:mt-8 prose-h3:mt-5 prose-dl:grid prose-dl:gap-2 [&_.mmf-comparison-grid]:grid [&_.mmf-comparison-grid]:gap-4 md:[&_.mmf-comparison-grid]:grid-cols-2 [&_article]:my-2 [&_article]:rounded-2xl [&_article]:border [&_article]:border-border [&_article]:bg-card [&_article]:p-5 [&_dl>div]:grid [&_dl>div]:grid-cols-2 [&_dl>div]:gap-3 [&_dt]:text-xs [&_dd]:break-words [&_dd]:text-sm" dangerouslySetInnerHTML={{ __html: page.contentHtml }} />
  </article>;
}
