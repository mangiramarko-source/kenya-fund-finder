import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewsRow {
  id: string;
  title: string;
  summary: string;
  source: string;
  date_published: string;
  url: string | null;
  category: string;
  read_time: string;
  is_featured: boolean;
  status: string;
  updated_at: string;
}

const categories = ["Yield Updates", "Market News", "Regulatory Updates", "Fund Announcements", "Market Insight"];

const emptyNews = {
  title: "", summary: "", source: "", date_published: new Date().toISOString().split("T")[0],
  url: "", category: "Market News", read_time: "3 min read", is_featured: false, status: "draft",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_review: "bg-warning/10 text-warning",
  published: "bg-accent/10 text-accent",
};

const AdminNews = () => {
  const [articles, setArticles] = useState<NewsRow[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<typeof emptyNews & { id?: string }>(emptyNews);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("news_articles")
      .select("*")
      .order("date_published", { ascending: false });
    if (data) setArticles(data as NewsRow[]);
  };

  useEffect(() => { load(); }, []);

  const filtered = articles.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const logChange = async (entityId: string, action: string, oldValues: any, newValues: any) => {
    await supabase.from("change_log").insert({
      entity_type: "news",
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      changed_by: user?.id,
    });
  };

  const handleSave = async () => {
    if (!editing.title || !editing.summary) {
      toast({ title: "Validation Error", description: "Title and summary are required.", variant: "destructive" });
      return;
    }

    const payload = {
      title: editing.title,
      summary: editing.summary,
      source: editing.source,
      date_published: editing.date_published,
      url: editing.url || null,
      category: editing.category,
      read_time: editing.read_time,
      is_featured: editing.is_featured,
      status: editing.status,
      updated_by: user?.id,
    };

    if (editing.id) {
      const old = articles.find((a) => a.id === editing.id);
      const { error } = await supabase.from("news_articles").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      await logChange(editing.id, "update", old, payload);
    } else {
      const { data, error } = await supabase.from("news_articles").insert({ ...payload, created_by: user?.id }).select("id").single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      if (data) await logChange(data.id, "create", null, payload);
    }

    toast({ title: "Saved" });
    setDialogOpen(false);
    setEditing(emptyNews);
    load();
  };

  const handleDelete = async (article: NewsRow) => {
    if (!confirm(`Delete "${article.title}"?`)) return;
    const { error } = await supabase.from("news_articles").delete().eq("id", article.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logChange(article.id, "delete", article, null);
    toast({ title: "Deleted" });
    load();
  };

  const openEdit = (a: NewsRow) => {
    setEditing({
      id: a.id, title: a.title, summary: a.summary, source: a.source,
      date_published: a.date_published, url: a.url || "", category: a.category,
      read_time: a.read_time, is_featured: a.is_featured, status: a.status,
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">News Management</h2>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(emptyNews); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-2 h-4 w-4" /> Add Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Article" : "New Article"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Summary</Label>
                <Textarea value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} className="mt-1" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Source</Label>
                  <Input value={editing.source} onChange={(e) => setEditing({ ...editing, source: e.target.value })} className="mt-1" placeholder="e.g. CMA, Britam" />
                </div>
                <div>
                  <Label>Date Published</Label>
                  <Input type="date" value={editing.date_published} onChange={(e) => setEditing({ ...editing, date_published: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>URL or PDF Link</Label>
                <Input value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Read Time</Label>
                  <Input value={editing.read_time} onChange={(e) => setEditing({ ...editing, read_time: e.target.value })} className="mt-1" />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} />
                    <Label>Featured</Label>
                  </div>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Save Article
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map((article) => (
          <div key={article.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className={statusColors[article.status] || ""}>
                  {article.status === "pending_review" ? "Pending" : article.status}
                </Badge>
                <Badge variant="outline" className="text-xs">{article.category}</Badge>
                {article.is_featured && <Badge className="bg-accent/15 text-accent border-0 text-xs">Featured</Badge>}
              </div>
              <h3 className="font-semibold text-sm truncate">{article.title}</h3>
              <p className="text-xs text-muted-foreground">
                {article.source && `${article.source} · `}
                {new Date(article.date_published).toLocaleDateString("en-KE")}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(article)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(article)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center py-8 text-muted-foreground">No articles found. Add your first article above.</p>
        )}
      </div>
    </div>
  );
};

export default AdminNews;
