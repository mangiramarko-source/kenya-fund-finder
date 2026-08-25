import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getValidatedSupabaseConfig } from "@/lib/supabase-config";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Upload, X, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NewsRow {
  id: string;
  title: string;
  summary: string;
  content: string | null;
  source: string;
  date_published: string;
  url: string | null;
  category: string;
  read_time: string;
  is_featured: boolean;
  status: string;
  updated_at: string;
  image_url: string | null;
}

const categories = ["Yield Updates", "Market News", "Regulatory Updates", "Fund Announcements", "Market Insight"];

const emptyNews = {
  title: "", summary: "", content: "", source: "", date_published: new Date().toISOString().split("T")[0],
  url: "", category: "Market News", read_time: "3 min read", is_featured: false, status: "draft", image_url: "",
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
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleFetchNewsNow = async () => {
    setIsFetchingNews(true);
    try {
      const { supabaseUrl } = getValidatedSupabaseConfig();
      const baseUrl = supabaseUrl;
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`${baseUrl}/functions/v1/fetch-news`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result?.error || "Fetch failed");
      const inserted = result?.inserted ?? result?.count ?? 0;
      toast({
        title: "News fetch complete",
        description: typeof inserted === "number"
          ? `${inserted} new article${inserted === 1 ? "" : "s"} added.`
          : "Fetch triggered successfully.",
      });
      await load();
    } catch (e: any) {
      toast({
        title: "Fetch failed",
        description: e?.message || "Could not trigger news fetch.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingNews(false);
    }
  };

  const load = async () => {
    const { data } = await supabase
      .from("news_articles")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setArticles(data.map((d: any) => ({ ...d, content: d.content || null })) as NewsRow[]);
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

  const getBucketPathFromPublicUrl = (url: string | null) => {
    if (!url) return null;
    const marker = "/storage/v1/object/public/news-images/";
    const index = url.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.slice(index + marker.length));
  };

  const uploadNewsImage = async (file: File) => {
    if (!user) {
      toast({ title: "Authentication required", description: "Please sign in again.", variant: "destructive" });
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Unsupported image", description: "Use JPG, PNG, WEBP, or GIF.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please upload an image under 5MB.", variant: "destructive" });
      return;
    }

    setIsUploadingImage(true);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      setIsUploadingImage(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("news-images").getPublicUrl(path);
    const nextImageUrl = publicUrlData.publicUrl;

    if (editing.id) {
      const oldArticle = articles.find((article) => article.id === editing.id);
      const { error: updateError } = await supabase
        .from("news_articles")
        .update({ image_url: nextImageUrl, updated_by: user.id })
        .eq("id", editing.id);

      if (updateError) {
        setIsUploadingImage(false);
        toast({ title: "Image save failed", description: updateError.message, variant: "destructive" });
        return;
      }

      const previousPath = getBucketPathFromPublicUrl(oldArticle?.image_url ?? null);
      if (previousPath) {
        await supabase.storage.from("news-images").remove([previousPath]);
      }

      await logChange(editing.id, "update", oldArticle, { image_url: nextImageUrl, updated_by: user.id });
      await load();
      toast({ title: "Image updated" });
    } else {
      toast({ title: "Image uploaded", description: "Save the article to attach this image." });
    }

    setEditing((prev) => ({ ...prev, image_url: nextImageUrl }));
    setIsUploadingImage(false);
  };

  const handleSave = async () => {
    if (!editing.title || !editing.summary) {
      toast({ title: "Validation Error", description: "Title and summary are required.", variant: "destructive" });
      return;
    }
    if (editing.url && !/^https?:\/\//.test(editing.url)) {
      toast({ title: "Invalid URL", description: "Source URL must start with https://", variant: "destructive" });
      return;
    }

    const payload: any = {
      title: editing.title,
      summary: editing.summary,
      content: editing.content || null,
      source: editing.source,
      date_published: editing.date_published,
      url: editing.url || null,
      category: editing.category,
      read_time: editing.read_time,
      is_featured: editing.is_featured,
      status: editing.status,
      image_url: editing.image_url || null,
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
    const oldImagePath = getBucketPathFromPublicUrl(article.image_url);
    const { error } = await supabase.from("news_articles").delete().eq("id", article.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (oldImagePath) {
      await supabase.storage.from("news-images").remove([oldImagePath]);
    }
    await logChange(article.id, "delete", article, null);
    toast({ title: "Deleted" });
    load();
  };

  const openEdit = (a: NewsRow) => {
    setEditing({
      id: a.id, title: a.title, summary: a.summary, content: a.content || "", source: a.source,
      date_published: a.date_published, url: a.url || "", category: a.category,
      read_time: a.read_time, is_featured: a.is_featured, status: a.status, image_url: a.image_url || "",
    });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h2 className="text-xl font-bold">News Management</h2>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFetchNewsNow}
            disabled={isFetchingNews}
          >
            {isFetchingNews ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isFetchingNews ? "Fetching..." : "Fetch News Now"}
          </Button>
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
                <Textarea value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} className="mt-1" rows={3} />
              </div>
              <div>
                <Label>Full Content</Label>
                <Textarea
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="mt-1"
                  rows={8}
                  placeholder="Full article content. Each paragraph on a new line..."
                />
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
              <div>
                <Label>Image</Label>
                <div className="mt-1 space-y-2">
                  {editing.image_url && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                      <img src={editing.image_url} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditing({ ...editing, image_url: "" })}
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={editing.image_url}
                      onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                      placeholder="Paste URL or upload →"
                      className="flex-1"
                    />
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-input bg-background text-sm font-medium cursor-pointer hover:bg-accent/10 transition-colors shrink-0 disabled:pointer-events-none disabled:opacity-50">
                      {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploadingImage ? "Uploading..." : "Upload"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.currentTarget.value = "";
                          if (!file) return;
                          await uploadNewsImage(file);
                        }}
                      />
                    </label>
                  </div>
                  {editing.id && (
                    <p className="text-[11px] text-muted-foreground">Uploaded image changes are saved immediately for existing articles.</p>
                  )}
                </div>
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
              <Button onClick={handleSave} disabled={isUploadingImage} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                Save Article
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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
