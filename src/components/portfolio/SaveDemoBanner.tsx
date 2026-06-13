import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useState } from "react";

const KEY = "kff_demo_banner_dismissed_v1";

const SaveDemoBanner = ({ itemCount }: { itemCount: number }) => {
  const [dismissed, setDismissed] = useState<boolean>(
    typeof window !== "undefined" && localStorage.getItem(KEY) === "1",
  );

  // Only surface the prompt once the user has invested something meaningful.
  if (dismissed || itemCount < 2) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2.5 flex items-center gap-3 text-xs md:text-sm">
      <Save className="h-4 w-4 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-primary">Save your portfolio.</span>{" "}
        <span className="text-muted-foreground">
          Create a free account to sync across devices, get yield alerts, and a weekly digest.
        </span>
      </div>
      <Button asChild size="sm" className="h-7 text-xs shrink-0">
        <Link to="/auth">Sign up free</Link>
      </Button>
      <button
        aria-label="Dismiss"
        onClick={dismiss}
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default SaveDemoBanner;
