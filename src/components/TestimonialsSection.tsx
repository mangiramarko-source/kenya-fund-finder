import { useEffect, useState } from "react";
import { Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string;
  quote: string;
  avatar_url: string;
}

const TestimonialsSection = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("testimonials")
        .select("id, author_name, author_role, quote, avatar_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      if (!cancelled) {
        setItems((data as Testimonial[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || items.length === 0) return null;

  const initials = (name: string) =>
    name.split(/\s+/).map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="mt-8 px-4 md:px-6 py-6 md:py-8 border-t border-border"
    >
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-end justify-between mb-4 md:mb-5">
          <div>
            <h2 id="testimonials-heading" className="text-base md:text-lg font-bold text-foreground">
              What investors are saying
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Real feedback from people using Kenya Fund Finder.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {items.map((t) => (
            <article
              key={t.id}
              className="rounded-xl border border-border bg-card p-4 md:p-5 hover:border-accent/40 transition-colors"
            >
              <Quote className="h-4 w-4 text-accent/70 mb-2" />
              <p className="text-sm text-foreground leading-relaxed">"{t.quote}"</p>
              <div className="mt-4 flex items-center gap-2.5">
                {t.avatar_url ? (
                  <img
                    src={t.avatar_url}
                    alt={t.author_name}
                    loading="lazy"
                    className="h-8 w-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted text-foreground text-[11px] font-semibold inline-flex items-center justify-center border border-border">
                    {initials(t.author_name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{t.author_name}</p>
                  {t.author_role && (
                    <p className="text-[11px] text-muted-foreground truncate">{t.author_role}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
