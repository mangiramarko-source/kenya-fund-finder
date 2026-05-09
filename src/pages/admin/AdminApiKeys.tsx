import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Copy, Trash2, Plus, RefreshCw } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  is_active: boolean;
  rate_limit_per_minute: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface UsageRow {
  id: string;
  endpoint: string;
  status_code: number;
  created_at: string;
}

// Web Crypto sha-256 → hex
async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRandomKey(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return "kff_" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ENDPOINT_BASE = `https://qrmthciurngpzpjhevdj.supabase.co/functions/v1/external-api`;

export default function AdminApiKeys() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [usage, setUsage] = useState<Record<string, UsageRow[]>>({});
  const [name, setName] = useState("");
  const [rate, setRate] = useState(60);
  const [revealed, setRevealed] = useState<{ id: string; key: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, is_active, rate_limit_per_minute, last_used_at, expires_at, created_at")
      .order("created_at", { ascending: false });
    setKeys((data as ApiKey[]) ?? []);

    const { data: u } = await supabase
      .from("api_key_usage")
      .select("id, api_key_id, endpoint, status_code, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    const grouped: Record<string, UsageRow[]> = {};
    (u ?? []).forEach((row: any) => {
      grouped[row.api_key_id] = grouped[row.api_key_id] || [];
      grouped[row.api_key_id].push(row);
    });
    setUsage(grouped);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setLoading(true);
    const fullKey = generateRandomKey();
    const hash = await sha256Hex(fullKey);
    const prefix = fullKey.slice(0, 12);
    const { data, error } = await supabase.from("api_keys").insert({
      name: name.trim(),
      key_prefix: prefix,
      key_hash: hash,
      rate_limit_per_minute: rate,
      created_by: user?.id,
    }).select().single();
    setLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setRevealed({ id: data.id, key: fullKey });
    setName("");
    load();
  };

  const toggle = async (k: ApiKey) => {
    await supabase.from("api_keys").update({ is_active: !k.is_active }).eq("id", k.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Revoke this key permanently? Apps using it will stop working.")) return;
    await supabase.from("api_keys").delete().eq("id", id);
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">External API Keys</h2>
        <p className="text-sm text-muted-foreground">
          Issue keys for other apps/AI projects to read public market data via{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">{ENDPOINT_BASE}</code>
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="font-medium text-sm">Create new key</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Name / consumer</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI training pipeline" />
          </div>
          <div>
            <Label className="text-xs">Rate limit (req/min)</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} min={1} max={1000} />
          </div>
          <div className="flex items-end">
            <Button onClick={create} disabled={loading} className="w-full gap-2">
              <Plus className="h-4 w-4" /> Generate key
            </Button>
          </div>
        </div>

        {revealed && (
          <div className="rounded-md border border-warning/40 bg-warning/10 p-3 space-y-2">
            <div className="text-xs font-medium">⚠️ Copy this key now — it will not be shown again.</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded break-all">{revealed.key}</code>
              <Button size="sm" variant="outline" onClick={() => copy(revealed.key)}><Copy className="h-3 w-3" /></Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setRevealed(null)}>Dismiss</Button>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-3">
        <div className="font-medium text-sm">Usage example (curl)</div>
        <pre className="text-xs bg-muted p-3 rounded overflow-auto">{`curl -H "Authorization: Bearer YOUR_KEY" \\
  ${ENDPOINT_BASE}/funds

# Bulk export everything:
curl -H "Authorization: Bearer YOUR_KEY" \\
  ${ENDPOINT_BASE}/export`}</pre>
      </Card>

      <div className="space-y-3">
        {keys.length === 0 && <p className="text-sm text-muted-foreground">No keys yet.</p>}
        {keys.map((k) => {
          const recent = usage[k.id] ?? [];
          const last24 = recent.filter((r) => Date.now() - new Date(r.created_at).getTime() < 86400000).length;
          return (
            <Card key={k.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="font-medium">{k.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}…</div>
                  <div className="text-xs text-muted-foreground">
                    {k.rate_limit_per_minute} req/min · {last24} calls in last 24h ·{" "}
                    {k.last_used_at ? `last used ${new Date(k.last_used_at).toLocaleString()}` : "never used"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={k.is_active} onCheckedChange={() => toggle(k)} />
                    <span className="text-xs">{k.is_active ? "Active" : "Disabled"}</span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(k.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {recent.length > 0 && (
                <details className="mt-3">
                  <summary className="text-xs text-muted-foreground cursor-pointer">Recent calls ({recent.length})</summary>
                  <div className="mt-2 max-h-40 overflow-auto text-xs space-y-0.5">
                    {recent.slice(0, 30).map((r) => (
                      <div key={r.id} className="flex justify-between gap-2 font-mono">
                        <span className={r.status_code >= 400 ? "text-destructive" : "text-muted-foreground"}>
                          {r.status_code}
                        </span>
                        <span className="flex-1">{r.endpoint}</span>
                        <span className="text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
