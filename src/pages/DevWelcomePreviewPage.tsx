import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import OnboardingSetup from "@/components/onboarding/OnboardingSetup";
import { buildOnboardingAssets } from "@/components/onboarding/onboardingAssets";
import { useLiveAssets } from "@/hooks/usePortfolio";

// Development-only, no auth bypass, no preference writes and no email endpoint.
export default function DevWelcomePreviewPage() {
  const [open, setOpen] = useState(true);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("Demo only — no preferences, watchlist items, portfolio entries, or emails are saved.");
  const { data: liveAssets, isLoading } = useLiveAssets();
  const assets = useMemo(() => buildOnboardingAssets(liveAssets), [liveAssets]);
  if (!import.meta.env.DEV) return null;
  return <main className="mx-auto max-w-2xl p-6 space-y-4">
    <h1 className="text-2xl font-semibold">New-user setup preview</h1>
    <p role="status">{message}</p>
    <Button onClick={() => { setVersion(v => v + 1); setOpen(true); }}>Restart preview</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-background p-5 sm:p-7">
        {isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading the available assets…</p> : <OnboardingSetup key={version} assets={assets} onComplete={async () => true} onExplore={() => { setMessage("Demo complete — nothing was saved."); setOpen(false); }} />}
      </DialogContent>
    </Dialog>
  </main>;
}
