import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

const MobileAiLabFab = () => {
  return (
    <Link
      to="/ai-lab"
      aria-label="Open AI Lab"
      className="md:hidden fixed right-4 z-50 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-600 dark:bg-emerald-600 px-4 py-3 text-sm font-semibold text-white dark:text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all bottom-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <Sparkles className="h-4 w-4 shrink-0 text-white" aria-hidden="true" />
      <span>AI</span>
    </Link>
  );
};

export default MobileAiLabFab;
