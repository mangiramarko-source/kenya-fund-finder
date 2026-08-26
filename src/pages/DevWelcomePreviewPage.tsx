import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import ChooseUpdates from "@/components/home/ChooseUpdates";

// Development-only, no auth bypass, no preference writes and no email endpoint.
export default function DevWelcomePreviewPage() {
  const [open, setOpen] = useState(true);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState("Demo only — no preferences are saved and no email is sent.");
  if (!import.meta.env.DEV) return null;
  return <main className="mx-auto max-w-2xl p-6 space-y-4">
    <h1 className="text-2xl font-semibold">Welcome step preview</h1>
    <p role="status">{message}</p>
    <Button onClick={() => { setVersion(v => v + 1); setOpen(true); }}>Restart preview</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-background p-5 sm:p-7">
        <ChooseUpdates key={version} onSave={async () => true} onContinue={() => setOpen(false)} onCreateAlert={() => { setMessage("Demo: this would open the price-alert form, not create an alert automatically."); setOpen(false); }} />
      </DialogContent>
    </Dialog>
  </main>;
}
