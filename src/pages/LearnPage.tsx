import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";
import { faqItems } from "@/data/faq";
import { useDocumentTitle, useJsonLd } from "@/hooks/useDocumentTitle";

const LearnPage = () => {
  useDocumentTitle("Learn About Money Market Funds in Kenya", "Everything you need to know about MMFs in Kenya – how they work, risks, returns, and CMA regulation explained simply.");

  useJsonLd({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });

  return (
  <div className="container py-10 max-w-2xl">
    <div className="text-center mb-10">
      <BookOpen className="h-10 w-10 text-accent mx-auto mb-4" />
      <h1 className="text-2xl md:text-3xl font-bold mb-2">Learn About MMFs</h1>
      <p className="text-muted-foreground">Everything you need to know about Money Market Funds in Kenya, explained simply.</p>
    </div>

    <Accordion type="single" collapsible className="space-y-2">
      {faqItems.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="rounded-lg border border-border bg-card px-4">
          <AccordionTrigger className="text-left font-semibold hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>

    <div className="mt-10 p-4 rounded-lg bg-muted/50 border border-border">
      <p className="text-xs text-muted-foreground leading-relaxed">
        <strong>Disclaimer:</strong> The information provided on this platform is for educational and informational purposes only and does not constitute investment advice, financial advice, or a recommendation to buy or sell any financial product. Past performance is not indicative of future results. All investments carry risk, including the potential loss of principal. Consult a licensed financial advisor before making any investment decisions. All funds listed are regulated by the Capital Markets Authority (CMA) of Kenya.
      </p>
    </div>
  </div>
  );
};

export default LearnPage;
