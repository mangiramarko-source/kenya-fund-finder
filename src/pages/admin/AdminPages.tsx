import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Save, FileText } from "lucide-react";

interface SitePage {
  id: string;
  slug: string;
  title: string;
  content: string;
  meta: Record<string, string>;
}

const AdminPages = () => {
  const [pages, setPages] = useState<SitePage[]>([]);
  const [editing, setEditing] = useState<SitePage | null>(null);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const load = () => {
    supabase
      .from("site_pages")
      .select("*")
      .order("slug")
      .then(({ data }) => {
        if (data) {
          setPages(
            data.map((d) => ({
              id: d.id,
              slug: d.slug,
              title: d.title,
              content: d.content,
              meta: (d.meta as Record<string, string>) || {},
            }))
          );
        }
      });
  };

  useEffect(load, []);

  const save = async () => {
    if (!editing || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_pages")
      .update({
        title: editing.title,
        content: editing.content,
        meta: editing.meta as any,
        updated_by: user.id,
      })
      .eq("id", editing.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success("Page saved successfully");
      load();
      setEditing(null);
    }
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Editing: {editing.slug}</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <div>
          <Label>Title</Label>
          <Input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label>Content (plain text, one paragraph per line)</Label>
          <Textarea
            value={editing.content}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            className="mt-1 min-h-[300px] font-mono text-sm"
          />
        </div>
        {editing.slug === "contact" && (
          <div>
            <Label>Contact Email</Label>
            <Input
              value={editing.meta?.email || ""}
              onChange={(e) => setEditing({ ...editing, meta: { ...editing.meta, email: e.target.value } })}
              className="mt-1"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Site Pages</h3>
      <p className="text-sm text-muted-foreground">Edit About, Contact, Privacy Policy, Terms of Use, and the footer Disclaimer.</p>
      <div className="space-y-2">
        {pages.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{p.title}</p>
                <p className="text-xs text-muted-foreground">/{p.slug}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(p)}>Edit</Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPages;
