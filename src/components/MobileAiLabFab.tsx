import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const MobileAiLabFab = () => {
  return (
    <Link
      to="/ai-lab"
      aria-label="Open AI Lab"
      className="md:hidden fixed right-4 z-50 flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/25 transition-transform active:scale-95 bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>AI</span>
    </Link>
  );
};

export default MobileAiLabFab;
