import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { CONTENT_TYPES, PLATFORMS, PLATFORM_LABEL } from "@/lib/social/contentTypes";

export default function SocialCreatePost({ onCreated }: { onCreated?: () => void }) {
  const [contentType, setContentType] = useState("daily_mmf_update");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "facebook", "x"]);
  const [fundIds, setFundIds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const def = CONTENT_TYPES.find(c => c.key === contentType);

  const funds = useQuery({
    queryKey: ["funds-for-social", def?.defaultCurrency],
    queryFn: async () => {
      let q = supabase.from("funds").select("id, name, manager, annual_yield, yield_unit, fund_type")
        .eq("is_published", true).eq("fund_type", "money_market")
        .order("annual_yield", { ascending: false }).limit(50);
      if (def?.defaultCurrency && def.defaultCurrency !== "%") q = q.eq("yield_unit", def.defaultCurrency);
      const { data } = await q;
      return data ?? [];
    },
  });

  const toggle = (p: string) => setPlatforms(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]);
  const toggleFund = (id: string) => setFundIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const generate = async () => {
    if (platforms.length === 0) { toast({ title: "Pick at least one platform", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("social-generate-post", {
      body: { content_type: contentType, platforms, fund_ids: fundIds, custom_note: note },
    });
    setBusy(false);
    if (error) { toast({ title: "Generation failed", description: error.message, variant: "destructive" }); return; }
    const created = data?.created_ids?.length ?? 0;
    toast({ title: `Generated ${created} post${created === 1 ? "" : "s"}`, description: data?.errors?.length ? data.errors.join("; ") : "Open the Queue tab to review." });
    setNote("");
    setFundIds([]);
    onCreated?.();
  };

  return (
    <Card className="p-4 space-y-4 max-w-3xl">
      <div>
        <Label>Content type</Label>
        <Select value={contentType} onValueChange={setContentType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map(c => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">{def?.description}</p>
      </div>

      <div>
        <Label>Platforms</Label>
        <div className="flex gap-3 mt-2">
          {PLATFORMS.map(p => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <Checkbox checked={platforms.includes(p)} onCheckedChange={() => toggle(p)} />
              {PLATFORM_LABEL[p]}
            </label>
          ))}
        </div>
      </div>

      {def?.needsFunds && (
        <div>
          <Label>Funds (leave empty to auto-pick top {def.key === "fund_spotlight" ? 1 : def.key === "fund_comparison" ? 2 : 3})</Label>
          <div className="mt-2 max-h-48 overflow-y-auto border border-border rounded p-2 space-y-1">
            {funds.data?.map(f => (
              <label key={f.id} className="flex items-center gap-2 text-xs">
                <Checkbox checked={fundIds.includes(f.id)} onCheckedChange={() => toggleFund(f.id)} />
                <span className="flex-1 truncate">{f.name}</span>
                <span className="font-mono text-muted-foreground">{f.annual_yield}{f.yield_unit === "%" ? "%" : " " + f.yield_unit}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Optional note to the AI</Label>
        <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. focus on diaspora investors, mention the calculator" rows={2} />
      </div>

      <Button onClick={generate} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
        Generate post drafts
      </Button>
      <p className="text-xs text-muted-foreground">
        Generated drafts go to the Queue. Captions and image cards are AI-generated through Lovable AI Gateway and pass through a brand-safety filter.
      </p>
    </Card>
  );
}
