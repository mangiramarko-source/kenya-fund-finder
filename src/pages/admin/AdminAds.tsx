import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pencil, Trash2, Image, Video, ExternalLink, Eye, EyeOff,
  BarChart3, Upload, Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Ad {
  id: string;
  title: string;
  description: string;
  media_type: string;
  media_url: string;
  click_url: string;
  placement: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface AdForm {
  title: string;
  description: string;
  media_type: "image" | "video";
  media_url: string;
  click_url: string;
  placement: "sidebar" | "banner" | "in-feed";
  is_active: boolean;
  start_date: string;
  end_date: string;
}

const blank: AdForm = {
  title: "", description: "", media_type: "image", media_url: "",
  click_url: "", placement: "sidebar", is_active: true, start_date: "", end_date: "",
};

/** Call the manage-ads edge function to bypass ad blockers */
const callProxy = async (body: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  const res = await supabase.functions.invoke("manage-ads", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (res.error) throw new Error(res.error.message ?? "Request failed");
  const json = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (json.error) throw new Error(json.error);
  return json.data;
};

const AdminAds = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [form, setForm] = useState<AdForm>(blank);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: () => callProxy({ action: "list" }) as Promise<Ad[]>,
  });

  const { data: stats = {} } = useQuery({
    queryKey: ["admin-ad-stats"],
    queryFn: async () => {
      const data = await callProxy({ action: "stats" });
      const m: Record<string, { impressions: number; clicks: number }> = {};
      (data || []).forEach((e: any) => {
        if (!m[e.ad_id]) m[e.ad_id] = { impressions: 0, clicks: 0 };
        if (e.event_type === "impression") m[e.ad_id].impressions++;
        else if (e.event_type === "click") m[e.ad_id].clicks++;
      });
      return m;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-ads"] });
    qc.invalidateQueries({ queryKey: ["admin-ad-stats"] });
  };

  const saveMut = useMutation({
    mutationFn: async (f: AdForm) => {
      if (!f.title.trim()) throw new Error("Title required");
      if (!f.media_url.trim()) throw new Error("Media required");
      if (f.click_url && !/^https?:\/\//i.test(f.click_url)) throw new Error("Click URL must start with http(s)://");
      const payload = {
        title: f.title.trim(), description: f.description.trim(),
        media_type: f.media_type, media_url: f.media_url.trim(),
        click_url: f.click_url.trim(), placement: f.placement,
        is_active: f.is_active,
        start_date: f.start_date || null, end_date: f.end_date || null,
        updated_by: user?.id ?? null,
      };
      if (editing) {
        await callProxy({ action: "update", id: editing.id, payload });
      } else {
        await callProxy({ action: "create", payload: { ...payload, created_by: user?.id ?? null } });
      }
    },
    onSuccess: () => { invalidate(); toast.success(editing ? "Ad updated" : "Ad created"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await callProxy({ action: "delete", id });
    },
    onSuccess: () => { invalidate(); toast.success("Ad deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await callProxy({ action: "update", id, payload: { is_active: active } });
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10 MB"); return; }
    setUploading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("ads").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: u } = supabase.storage.from("ads").getPublicUrl(path);
      setForm((p) => ({ ...p, media_url: u.publicUrl, media_type: file.type.startsWith("video/") ? "video" : "image" }));
      toast.success("Uploaded");
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message || String(err)));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openCreate = () => { setEditing(null); setForm(blank); setOpen(true); };
  const openEdit = (ad: Ad) => {
    setEditing(ad);
    setForm({
      title: ad.title, description: ad.description,
      media_type: ad.media_type as any, media_url: ad.media_url,
      click_url: ad.click_url, placement: ad.placement as any,
      is_active: ad.is_active, start_date: ad.start_date || "", end_date: ad.end_date || "",
    });
    setOpen(true);
  };
  const closeDialog = () => { setOpen(false); setEditing(null); setForm(blank); };
  const set = <K extends keyof AdForm>(k: K, v: AdForm[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Ads Manager</h2>
          <p className="text-sm text-muted-foreground">{ads.length} ad{ads.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="h-4 w-4" /> New Ad</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : ads.length === 0 ? (
        <Card><CardContent className="py-14 text-center text-muted-foreground">No ads yet.</CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => {
            const s = stats[ad.id];
            const imp = s?.impressions ?? 0;
            const clk = s?.clicks ?? 0;
            const ctr = imp ? ((clk / imp) * 100).toFixed(1) : "—";
            return (
              <Card key={ad.id} className="overflow-hidden">
                <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                  {ad.media_url ? (
                    ad.media_type === "video" ? (
                      <video src={ad.media_url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                    )
                  ) : <span className="text-muted-foreground text-sm">No media</span>}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant={ad.is_active ? "default" : "secondary"} className="text-[10px]">
                      {ad.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] bg-background/80">
                      {ad.media_type === "video" ? <Video className="h-3 w-3 mr-0.5" /> : <Image className="h-3 w-3 mr-0.5" />}
                      {ad.media_type}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-background/80">{ad.placement}</Badge>
                </div>
                <CardContent className="p-3 space-y-2">
                  <p className="font-semibold text-sm text-foreground truncate">{ad.title}</p>
                  {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5"><BarChart3 className="h-3 w-3" /> {imp} views</span>
                    <span>{clk} clicks</span>
                    <span>{ctr}% CTR</span>
                  </div>
                  <div className="flex items-center gap-1 pt-1 border-t border-border">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openEdit(ad)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                      onClick={() => toggleMut.mutate({ id: ad.id, active: !ad.is_active })}>
                      {ad.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {ad.is_active ? "Off" : "On"}
                    </Button>
                    {ad.click_url && /^https?:\/\//i.test(ad.click_url) && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" asChild>
                        <a href={ad.click_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                      </Button>
                    )}
                    <div className="ml-auto">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{ad.title}"?</AlertDialogTitle>
                            <AlertDialogDescription>Permanently deletes this ad and its analytics.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMut.mutate(ad.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Ad" : "New Ad"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMut.mutate(form); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ad title" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Short description" />
            </div>
            <div className="space-y-2">
              <Label>Media *</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
                {uploading ? (
                  <span className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</span>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-6 w-6" /><span className="text-sm">Click to upload</span><span className="text-[10px]">Max 10 MB</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Or paste URL:</p>
              <Input value={form.media_url} onChange={(e) => set("media_url", e.target.value)} placeholder="https://..." />
              {form.media_url && (
                <div className="rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                  {form.media_type === "video" ? (
                    <video src={form.media_url} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={form.media_url} alt="Preview" className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Media Type</Label>
                <Select value={form.media_type} onValueChange={(v) => set("media_type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="image">Image</SelectItem><SelectItem value="video">Video</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(v) => set("placement", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="in-feed">In-Feed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Click URL</Label>
              <Input value={form.click_url} onChange={(e) => set("click_url", e.target.value)} placeholder="https://advertiser.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /><Label>Active</Label>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMut.isPending}>
                {saveMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Saving…</> : editing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAds;
