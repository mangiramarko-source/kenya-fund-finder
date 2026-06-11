import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Facebook, Twitter, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Account = {
  id: string;
  platform: string;
  handle: string;
  display_name: string;
  connection_status: string;
  meta: any;
};

export default function SocialAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    void load();
    // Handle redirect-back messages
    const params = new URLSearchParams(window.location.search);
    const status = params.get("meta_oauth");
    if (status === "connected") {
      toast({ title: "Facebook connected", description: `${params.get("pages") ?? "?"} Page(s) linked in test mode.` });
    } else if (status === "no_pages") {
      toast({ title: "No Pages found", description: "Your Facebook user has no manageable Pages.", variant: "destructive" });
    } else if (status === "denied") {
      toast({ title: "Authorization denied", variant: "destructive" });
    } else if (status === "error") {
      toast({ title: "OAuth error", description: params.get("reason") ?? "unknown", variant: "destructive" });
    }
  }, []);

  async function load() {
    const { data } = await supabase
      .from("social_accounts")
      .select("id, platform, handle, display_name, connection_status, meta")
      .order("created_at", { ascending: false });
    setAccounts((data ?? []) as Account[]);
  }

  async function connectFacebook() {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("social-meta-oauth-start", {
        body: { redirect_to: window.location.pathname },
      });
      if (error) throw error;
      if (!data?.authorize_url) throw new Error("No authorize URL returned");
      window.location.href = data.authorize_url;
    } catch (e: any) {
      toast({ title: "Could not start Facebook login", description: e.message, variant: "destructive" });
      setConnecting(false);
    }
  }

  const fbConnected = accounts.filter(a => a.platform === "facebook" && a.connection_status === "connected");

  const platforms = [
    { key: "instagram", label: "Instagram Business", icon: Instagram, color: "text-pink-500", phase2: true },
    { key: "facebook", label: "Facebook Page", icon: Facebook, color: "text-blue-500", phase2: false },
    { key: "x", label: "X / Twitter", icon: Twitter, color: "text-sky-400", phase2: true },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-4 bg-blue-500/10 border-blue-500/30">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 text-blue-400" />
          <div className="text-sm">
            <div className="font-semibold mb-1">Phase 2 — Test mode</div>
            <p className="text-muted-foreground">
              Facebook OAuth is wired. Connecting a Page stores its access token server-side and marks the
              account as <code>test_mode = true</code>. No live posting happens yet — that ships when you flip
              test mode off after Meta App Review.
            </p>
          </div>
        </div>
      </Card>

      {platforms.map(p => {
        const Icon = p.icon;
        const connected = p.key === "facebook" ? fbConnected : [];
        return (
          <Card key={p.key} className="p-4">
            <div className="flex items-center gap-4">
              <Icon className={`h-8 w-8 ${p.color}`} />
              <div className="flex-1">
                <div className="font-semibold">{p.label}</div>
                <div className="text-xs text-muted-foreground">
                  {p.phase2
                    ? "Status: manual posting (Phase 2 — coming after Facebook is verified)"
                    : connected.length > 0
                      ? `Connected: ${connected.length} Page(s) — test mode`
                      : "Not connected"}
                </div>
              </div>
              {p.key === "facebook" ? (
                <Button onClick={connectFacebook} disabled={connecting}>
                  {connecting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {connected.length > 0 ? "Reconnect" : "Connect Facebook"}
                </Button>
              ) : (
                <Button variant="outline" disabled>Connect (Phase 2)</Button>
              )}
            </div>

            {connected.length > 0 && (
              <div className="mt-3 pl-12 space-y-1">
                {connected.map(a => (
                  <div key={a.id} className="text-xs flex justify-between border-t border-border pt-2">
                    <span className="font-mono">{a.display_name}</span>
                    <span className="text-muted-foreground">
                      Page ID {a.handle} {a.meta?.ig_business_id ? `· IG ${a.meta.ig_business_id}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
