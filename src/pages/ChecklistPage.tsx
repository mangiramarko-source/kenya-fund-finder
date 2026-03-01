import { useState, useEffect, useMemo } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronRight, Globe, FileText, Type, Shield, DollarSign, Lock, Award, Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ChecklistItem {
  id: string;
  label: string;
  hint?: string;
}

interface ChecklistSection {
  title: string;
  icon: React.ReactNode;
  items: ChecklistItem[];
}

const STORAGE_KEY = "adsense-checklist-state";

const sections: ChecklistSection[] = [
  {
    title: "Domain & Launch",
    icon: <Globe className="h-5 w-5" />,
    items: [
      { id: "domain-custom", label: "Custom domain connected", hint: "e.g. yourdomain.com instead of .lovable.app" },
      { id: "domain-public", label: "Website is publicly accessible" },
      { id: "domain-https", label: "HTTPS enabled (SSL certificate active)" },
      { id: "domain-mobile", label: "Site is mobile-friendly and responsive" },
      { id: "domain-published", label: "Site is published and live" },
    ],
  },
  {
    title: "Core Pages",
    icon: <FileText className="h-5 w-5" />,
    items: [
      { id: "pages-home", label: "Homepage present and complete" },
      { id: "pages-compare", label: "Comparison page with fund data" },
      { id: "pages-calculator", label: "Calculator page functional" },
      { id: "pages-articles", label: "10+ unique articles / news posts published" },
      { id: "pages-about", label: "About page explaining the site's purpose" },
      { id: "pages-contact", label: "Contact page with a real email address" },
      { id: "pages-privacy", label: "Privacy Policy page" },
      { id: "pages-terms", label: "Terms of Service page" },
      { id: "pages-disclaimer", label: "Disclaimer page or section" },
    ],
  },
  {
    title: "Content Quality",
    icon: <Type className="h-5 w-5" />,
    items: [
      { id: "content-original", label: "No copied or plagiarised content" },
      { id: "content-headings", label: "Proper heading hierarchy (H1 → H2 → H3)" },
      { id: "content-links", label: "No broken links (404s)" },
      { id: "content-empty", label: "No empty or placeholder pages" },
      { id: "content-coming", label: 'No "coming soon" sections' },
      { id: "content-readable", label: "Layout is readable and well-spaced" },
      { id: "content-formatting", label: "Consistent formatting across pages" },
    ],
  },
  {
    title: "Legal Protection",
    icon: <Shield className="h-5 w-5" />,
    items: [
      { id: "legal-disclaimer", label: "Disclaimer present on financial pages" },
      { id: "legal-privacy-cookies", label: "Privacy policy mentions cookies and ads" },
      { id: "legal-contact", label: "Contact information is visible" },
      { id: "legal-brand", label: "Owner or brand name visible on the site" },
    ],
  },
  {
    title: "AdSense Requirements",
    icon: <DollarSign className="h-5 w-5" />,
    items: [
      { id: "adsense-complete", label: "Site is complete with substantial content" },
      { id: "adsense-nav", label: "Clear and intuitive navigation" },
      { id: "adsense-account", label: "Google AdSense account created" },
      { id: "adsense-script", label: "AdSense script added to global <head>" },
      { id: "adsense-unit", label: "At least 1 ad unit placed" },
      { id: "adsense-prohibited", label: "No prohibited or adult content" },
      { id: "adsense-footer", label: "Footer contains links to Privacy Policy & Terms" },
    ],
  },
  {
    title: "Security Checks",
    icon: <Lock className="h-5 w-5" />,
    items: [
      { id: "sec-https", label: "HTTPS is active on all pages" },
      { id: "sec-mixed", label: "No mixed content warnings" },
      { id: "sec-contact-form", label: "Contact form is secure" },
      { id: "sec-admin-pw", label: "Strong admin password set" },
      { id: "sec-2fa", label: "Two-factor authentication enabled (if available)" },
      { id: "sec-backups", label: "Regular backups configured" },
      { id: "sec-api", label: "No exposed API keys in client code" },
      { id: "sec-admin-pages", label: "Admin pages are not publicly accessible" },
    ],
  },
  {
    title: "Trust Signals",
    icon: <Award className="h-5 w-5" />,
    items: [
      { id: "trust-logo", label: "Clean, professional logo" },
      { id: "trust-social", label: "Real social media links" },
      { id: "trust-about", label: "Clear about page with mission" },
      { id: "trust-copyright", label: "Copyright year is up to date" },
      { id: "trust-appearance", label: "Professional and complete appearance" },
    ],
  },
  {
    title: "Final Pre-Launch Check",
    icon: <Rocket className="h-5 w-5" />,
    items: [
      { id: "final-incognito", label: "Open site in Incognito / private window" },
      { id: "final-desktop", label: "Test full navigation on desktop" },
      { id: "final-mobile", label: "Test full navigation on mobile" },
      { id: "final-calculator", label: "Test calculator with different inputs" },
      { id: "final-forms", label: "Test all forms (contact, auth, etc.)" },
      { id: "final-layout", label: "Check layout and readability on all pages" },
    ],
  },
];

const allItemIds = sections.flatMap((s) => s.items.map((i) => i.id));

const ChecklistPage = () => {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
  }, [checked]);

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleSection = (title: string) => setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  const totalChecked = useMemo(() => allItemIds.filter((id) => checked[id]).length, [checked]);
  const totalItems = allItemIds.length;
  const pct = Math.round((totalChecked / totalItems) * 100);

  const sectionProgress = (s: ChecklistSection) => {
    const done = s.items.filter((i) => checked[i.id]).length;
    return { done, total: s.items.length };
  };

  return (
    <div className="container py-10 max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Website Readiness & AdSense Checklist</h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Track every requirement before applying for Google AdSense. Your progress is saved locally.
      </p>

      {/* Overall progress */}
      <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Overall Progress</span>
          <span className="text-sm font-bold text-accent">{totalChecked} / {totalItems} ({pct}%)</span>
        </div>
        <Progress value={pct} className="h-3" />
        {pct === 100 && (
          <p className="text-xs text-accent font-medium mt-2">🎉 All items complete — you're ready to apply for AdSense!</p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section) => {
          const { done, total } = sectionProgress(section);
          const isCollapsed = collapsed[section.title];
          const isComplete = done === total;

          return (
            <div key={section.title} className={`rounded-xl border bg-card overflow-hidden transition-colors ${isComplete ? "border-accent/40" : "border-border"}`}>
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center gap-3 w-full px-5 py-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className={`shrink-0 ${isComplete ? "text-accent" : "text-muted-foreground"}`}>{section.icon}</span>
                <span className="flex-1 font-semibold text-sm">{section.title}</span>
                <span className={`text-xs font-medium ${isComplete ? "text-accent" : "text-muted-foreground"}`}>
                  {done}/{total}
                </span>
                {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-4 space-y-1">
                  {section.items.map((item) => {
                    const isDone = !!checked[item.id];
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className={`flex items-start gap-3 w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                          isDone ? "bg-accent/5" : "hover:bg-muted/50"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className={isDone ? "line-through text-muted-foreground" : "text-foreground"}>
                            {item.label}
                          </span>
                          {item.hint && <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => { if (window.confirm("Reset all checklist progress?")) setChecked({}); }}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Reset all progress
        </button>
      </div>
    </div>
  );
};

export default ChecklistPage;
