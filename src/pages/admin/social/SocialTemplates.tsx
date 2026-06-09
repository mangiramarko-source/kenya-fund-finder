import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function SocialTemplates() {
  const tpls = useQuery({
    queryKey: ["social-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("social_post_templates").select("*").order("name");
      return data ?? [];
    },
  });

  const save = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from("social_post_templates").update(patch).eq("id", id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved" });
  };

  return (
    <div className="space-y-3">
      {tpls.data?.map(t => (
        <Card key={t.id} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs text-muted-foreground font-mono">{t.key}</div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              Enabled
              <Switch checked={t.enabled} onCheckedChange={(v) => save(t.id, { enabled: v })} />
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>System prompt</Label>
              <Textarea defaultValue={t.system_prompt} rows={5} onBlur={e => e.target.value !== t.system_prompt && save(t.id, { system_prompt: e.target.value })} />
            </div>
            <div>
              <Label>Image prompt</Label>
              <Textarea defaultValue={t.image_prompt} rows={5} onBlur={e => e.target.value !== t.image_prompt && save(t.id, { image_prompt: e.target.value })} />
            </div>
            <div>
              <Label>Caption skeleton</Label>
              <Textarea defaultValue={t.caption_skeleton ?? ""} rows={3} onBlur={e => e.target.value !== t.caption_skeleton && save(t.id, { caption_skeleton: e.target.value })} />
            </div>
            <div>
              <Label>Default hashtags (comma)</Label>
              <Input defaultValue={(t.hashtags_default ?? []).join(", ")} onBlur={e => {
                const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                save(t.id, { hashtags_default: arr });
              }} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
