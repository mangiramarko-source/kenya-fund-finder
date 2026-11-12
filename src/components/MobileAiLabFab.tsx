import { useNavigate } from "react-router-dom";
import KoraAiLauncher from "@/components/ai-lab/KoraAiLauncher";
import { useUniversalCompare } from "@/hooks/useUniversalCompare";
import { useCompare } from "@/hooks/useCompare";

const MobileAiLabFab = () => {
  const navigate = useNavigate();
  const universalCompare = useUniversalCompare();
  const legacyCompare = useCompare();

  const isComparing = (universalCompare?.selected?.length ?? 0) > 0 || (legacyCompare?.selected?.length ?? 0) > 0;

  if (isComparing) return null;

  return <KoraAiLauncher onActivate={() => navigate("/ai-lab")} className="md:hidden fixed right-4 z-40 bottom-[calc(5rem+env(safe-area-inset-bottom))]" />;
};

export default MobileAiLabFab;
