import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft, Info } from "lucide-react";

interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta: Record<string, string>;
  updated_at: string;
}

const SitePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<SitePage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    supabase
      .from("site_pages_public")
      .select("id, slug, title, content, meta, updated_at")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPage({
            id: data.id,
            slug: data.slug,
            title: data.title,
            content: data.content,
            meta: (data.meta as Record<string, string>) || {},
            updated_at: data.updated_at,
          });
        }
        setLoading(false);
      });
  }, [slug]);

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading...</div>;

  if (!page) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
        <Link to="/" className="text-accent hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const Icon = slug === "contact" ? Mail : Info;

  return (
    <div className="container py-10 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-accent/10">
          <Icon className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">{page.title}</h1>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        {page.content.split("\n").filter(Boolean).map((p, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed mb-4">{p}</p>
        ))}
      </div>

      {page.meta?.email && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold">Email Us</p>
              <a href={`mailto:${page.meta.email}`} className="text-sm text-accent hover:underline">
                {page.meta.email}
              </a>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-8">
        Last updated: {new Date(page.updated_at).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
      </p>
    </div>
  );
};

export default SitePage;
