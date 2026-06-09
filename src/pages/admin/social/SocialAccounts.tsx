import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Facebook, Twitter, Lock } from "lucide-react";

export default function SocialAccounts() {
  const platforms = [
    { key: "instagram", label: "Instagram Business", icon: Instagram, color: "text-pink-500" },
    { key: "facebook", label: "Facebook Page", icon: Facebook, color: "text-blue-500" },
    { key: "x", label: "X / Twitter", icon: Twitter, color: "text-sky-400" },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 mt-0.5 text-yellow-400" />
          <div className="text-sm">
            <div className="font-semibold mb-1">Phase 1 — Manual posting mode</div>
            <p className="text-muted-foreground">
              Auto-publishing to Meta and X is deferred to Phase 2. Today: generate the post, copy the caption, download the image, open the platform, then mark as manually posted.
              When you're ready, we'll wire Meta Graph + X API here and store tokens in the backend (never the browser).
            </p>
          </div>
        </div>
      </Card>

      {platforms.map(p => {
        const Icon = p.icon;
        return (
          <Card key={p.key} className="p-4 flex items-center gap-4">
            <Icon className={`h-8 w-8 ${p.color}`} />
            <div className="flex-1">
              <div className="font-semibold">{p.label}</div>
              <div className="text-xs text-muted-foreground">Status: manual posting</div>
            </div>
            <Button variant="outline" disabled>Connect (Phase 2)</Button>
          </Card>
        );
      })}
    </div>
  );
}
