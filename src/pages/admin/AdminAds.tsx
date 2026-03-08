import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image, Video, ExternalLink, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface Ad {
  id: string;
  title: string;
  description: string;
  media_type: "image" | "video";
  media_url: string;
  click_url: string;
  placement: "sidebar" | "banner" | "in-feed";
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

const emptyAd = {
  title: "",
  description: "",
  media_type: "image" as const,
  media_url: "",
  click_url: "",
  placement: "sidebar" as const,
  is_active: true,
  start_date: "",
  end_date: "",
};

const AdminAds = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [form, setForm] = useState(emptyAd);
  const [uploading, setUploading] = useState(false);
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ad[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (adData: typeof form) => {
      const payload = {
        title: adData.title,
        description: adData.description,
        media_type: adData.media_type,
        media_url: adData.media_url,
        click_url: adData.click_url,
        placement: adData.placement,
        is_active: adData.is_active,
        start_date: adData.start_date || null,
        end_date: adData.end_date || null,
        updated_by: user?.id,
      };

      if (editingAd) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ads").insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success(editingAd ? "Ad updated" : "Ad created");
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
      toast.success("Ad deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ads").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from("ads").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("ads").getPublicUrl(path);
    setForm((f) => ({
      ...f,
      media_url: urlData.publicUrl,
      media_type: file.type.startsWith("video/") ? "video" : "image",
    }));
    setUploading(false);
    toast.success("File uploaded");
  };

  const openCreate = () => {
    setEditingAd(null);
    setForm(emptyAd);
    setDialogOpen(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      description: ad.description,
      media_type: ad.media_type,
      media_url: ad.media_url,
      click_url: ad.click_url,
      placement: ad.placement,
      is_active: ad.is_active,
      start_date: ad.start_date || "",
      end_date: ad.end_date || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingAd(null);
    setForm(emptyAd);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.media_url.trim()) return toast.error("Media is required");
    saveMutation.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Ads Manager</h2>
          <p className="text-sm text-muted-foreground">{ads.length} ad{ads.length !== 1 ? "s" : ""} total</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Ad
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading ads…</p>
      ) : ads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No ads yet. Click "New Ad" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ads.map((ad) => (
            <Card key={ad.id} className="overflow-hidden">
              {/* Media preview */}
              <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                {ad.media_url ? (
                  ad.media_type === "video" ? (
                    <video src={ad.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="text-muted-foreground text-sm">No media</div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <Badge variant={ad.is_active ? "default" : "secondary"} className="text-[10px]">
                    {ad.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-background/80">
                    {ad.media_type === "video" ? <Video className="h-3 w-3 mr-0.5" /> : <Image className="h-3 w-3 mr-0.5" />}
                    {ad.media_type}
                  </Badge>
                </div>
              </div>

              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate">{ad.title}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{ad.placement}</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent className="p-3 pt-1 space-y-2">
                {ad.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>
                )}
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setPreviewAd(ad)}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => openEdit(ad)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => toggleMutation.mutate({ id: ad.id, is_active: !ad.is_active })}
                  >
                    {ad.is_active ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {ad.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm("Delete this ad?")) deleteMutation.mutate(ad.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Ad" : "Create New Ad"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ad title" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Media Upload (Image or Video) *</Label>
              <Input type="file" accept="image/*,video/*" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              {form.media_url && (
                <div className="mt-2 rounded-lg overflow-hidden border border-border aspect-video bg-muted">
                  {form.media_type === "video" ? (
                    <video src={form.media_url} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={form.media_url} alt="Preview" className="w-full h-full object-contain" />
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Or paste a URL directly:</p>
              <Input value={form.media_url} onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))} placeholder="https://..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Media Type</Label>
                <Select value={form.media_type} onValueChange={(v) => setForm((f) => ({ ...f, media_type: v as "image" | "video" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Placement</Label>
                <Select value={form.placement} onValueChange={(v) => setForm((f) => ({ ...f, placement: v as "sidebar" | "banner" | "in-feed" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="in-feed">In-Feed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Click URL</Label>
              <Input value={form.click_url} onChange={(e) => setForm((f) => ({ ...f, click_url: e.target.value }))} placeholder="https://advertiser.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : editingAd ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewAd} onOpenChange={() => setPreviewAd(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ad Preview — {previewAd?.placement}</DialogTitle>
          </DialogHeader>
          {previewAd && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border border-border bg-muted">
                {previewAd.media_type === "video" ? (
                  <video src={previewAd.media_url} controls autoPlay muted className="w-full" />
                ) : (
                  <img src={previewAd.media_url} alt={previewAd.title} className="w-full" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{previewAd.title}</p>
                {previewAd.description && <p className="text-xs text-muted-foreground">{previewAd.description}</p>}
              </div>
              {previewAd.click_url && (
                <a href={previewAd.click_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <ExternalLink className="h-3 w-3" /> {previewAd.click_url}
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAds;
