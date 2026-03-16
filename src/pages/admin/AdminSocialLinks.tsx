import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Save, Trash2, Share2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

const ICON_SUGGESTIONS = "twitter, facebook, instagram, linkedin, youtube, tiktok, github, globe";

const AdminSocialLinks = () => {
  const { user } = useAuth();
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLink, setNewLink] = useState({ platform: "", url: "", icon_name: "" });

  const fetchLinks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("social_links")
      .select("id, platform, url, icon_name, sort_order, is_active")
      .order("sort_order");
    setLinks((data as SocialLink[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLinks(); }, []);

  const updateLink = (id: string, field: string, value: string | number | boolean) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const l of links) {
        const { error } = await supabase.from("social_links").update({
          platform: l.platform,
          url: l.url,
          icon_name: l.icon_name,
          sort_order: l.sort_order,
          is_active: l.is_active,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        }).eq("id", l.id);
        if (error) throw error;
      }
      toast.success("Social links saved");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const addLink = async () => {
    if (!newLink.platform || !newLink.url) return toast.error("Fill platform & URL");
    const { error } = await supabase.from("social_links").insert({
      platform: newLink.platform,
      url: newLink.url,
      icon_name: newLink.icon_name || newLink.platform.toLowerCase(),
      sort_order: links.length + 1,
      updated_by: user?.id,
    });
    if (error) return toast.error(error.message);
    setNewLink({ platform: "", url: "", icon_name: "" });
    toast.success("Social link added");
    fetchLinks();
  };

  const deleteLink = async (id: string) => {
    const { error } = await supabase.from("social_links").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    fetchLinks();
  };

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading…</div>;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Share2 className="h-5 w-5 text-accent" /> Social Links
        </h2>
        <Button size="sm" onClick={saveAll} disabled={saving}>
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save All
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Icon names: {ICON_SUGGESTIONS}
      </p>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/70 text-xs">
              <th className="text-left px-3 py-2">Platform</th>
              <th className="text-left px-3 py-2">URL</th>
              <th className="text-left px-3 py-2">Icon</th>
              <th className="text-center px-3 py-2">Order</th>
              <th className="text-center px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <Input value={l.platform} onChange={(e) => updateLink(l.id, "platform", e.target.value)} className="h-7 text-xs" />
                </td>
                <td className="px-3 py-2">
                  <Input value={l.url} onChange={(e) => updateLink(l.id, "url", e.target.value)} className="h-7 text-xs" />
                </td>
                <td className="px-3 py-2">
                  <Input value={l.icon_name} onChange={(e) => updateLink(l.id, "icon_name", e.target.value)} className="h-7 w-24 text-xs" />
                </td>
                <td className="px-3 py-2 text-center">
                  <Input type="number" value={l.sort_order} onChange={(e) => updateLink(l.id, "sort_order", parseInt(e.target.value) || 0)} className="h-7 w-14 text-xs text-center mx-auto" />
                </td>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" checked={l.is_active} onChange={(e) => updateLink(l.id, "is_active", e.target.checked)} />
                </td>
                <td className="px-3 py-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {l.platform}?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove this social link.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteLink(l.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-muted-foreground text-sm">No social links yet. Add one below.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <Input placeholder="Platform (Twitter)" value={newLink.platform} onChange={(e) => setNewLink((p) => ({ ...p, platform: e.target.value }))} className="h-8 w-28 text-xs" />
        <Input placeholder="https://..." value={newLink.url} onChange={(e) => setNewLink((p) => ({ ...p, url: e.target.value }))} className="h-8 flex-1 min-w-[200px] text-xs" />
        <Input placeholder="Icon name" value={newLink.icon_name} onChange={(e) => setNewLink((p) => ({ ...p, icon_name: e.target.value }))} className="h-8 w-24 text-xs" />
        <Button size="sm" variant="outline" onClick={addLink} className="h-8"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
      </div>
    </section>
  );
};

export default AdminSocialLinks;
