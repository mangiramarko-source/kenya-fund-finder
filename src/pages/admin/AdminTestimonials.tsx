import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Testimonial {
  id: string;
  author_name: string;
  author_role: string;
  quote: string;
  avatar_url: string;
  sort_order: number;
  is_active: boolean;
}

const empty = (): Testimonial => ({
  id: "",
  author_name: "",
  author_role: "",
  quote: "",
  avatar_url: "",
  sort_order: 0,
  is_active: true,
});

const AdminTestimonials = () => {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Testimonial>(empty());
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, author_name, author_role, quote, avatar_url, sort_order, is_active")
      .order("sort_order", { ascending: true });
    if (error) toast.error("Failed to load testimonials");
    setItems((data as Testimonial[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!draft.author_name.trim() || !draft.quote.trim()) {
      toast.error("Name and quote are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("testimonials").insert({
      author_name: draft.author_name.trim(),
      author_role: draft.author_role.trim(),
      quote: draft.quote.trim(),
      avatar_url: draft.avatar_url.trim(),
      sort_order: draft.sort_order || items.length + 1,
      is_active: draft.is_active,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Testimonial added");
    setDraft(empty());
    load();
  };

  const updateField = (id: string, patch: Partial<Testimonial>) => {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const save = async (t: Testimonial) => {
    const { error } = await supabase
      .from("testimonials")
      .update({
        author_name: t.author_name,
        author_role: t.author_role,
        quote: t.quote,
        avatar_url: t.avatar_url,
        sort_order: t.sort_order,
        is_active: t.is_active,
      })
      .eq("id", t.id);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    const { error } = await supabase.from("testimonials").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Testimonials</h2>
        <p className="text-sm text-muted-foreground">
          Shown on the Overview page above the footer. Inactive items are hidden.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> Add new</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Author name *</Label>
            <Input value={draft.author_name} onChange={(e) => setDraft({ ...draft, author_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role / company</Label>
            <Input value={draft.author_role} onChange={(e) => setDraft({ ...draft, author_role: e.target.value })} placeholder="e.g. Personal Investor, Nairobi" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quote *</Label>
          <Textarea rows={3} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} />
        </div>
        <div className="grid md:grid-cols-3 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-xs">Avatar URL (optional)</Label>
            <Input value={draft.avatar_url} onChange={(e) => setDraft({ ...draft, avatar_url: e.target.value })} placeholder="https://…" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Sort order</Label>
            <Input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={draft.is_active} onCheckedChange={(v) => setDraft({ ...draft, is_active: v })} />
            <Label className="text-xs">Active</Label>
          </div>
          <Button onClick={create} disabled={saving}>{saving ? "Adding…" : "Add testimonial"}</Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Existing ({items.length})</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No testimonials yet.</p>
        ) : items.map((t) => (
          <Card key={t.id} className="p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Author</Label>
                <Input value={t.author_name} onChange={(e) => updateField(t.id, { author_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role / company</Label>
                <Input value={t.author_role} onChange={(e) => updateField(t.id, { author_role: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Quote</Label>
              <Textarea rows={3} value={t.quote} onChange={(e) => updateField(t.id, { quote: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-3 gap-3 items-end">
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Avatar URL</Label>
                <Input value={t.avatar_url} onChange={(e) => updateField(t.id, { avatar_url: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sort</Label>
                <Input type="number" value={t.sort_order} onChange={(e) => updateField(t.id, { sort_order: Number(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={t.is_active} onCheckedChange={(v) => updateField(t.id, { is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => remove(t.id)}>
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={() => save(t)}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminTestimonials;
