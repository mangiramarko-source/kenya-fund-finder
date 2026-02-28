import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen } from "lucide-react";
import { faqItems } from "@/data/funds";

const LearnPage = () => (
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
  </div>
);

export default LearnPage;
