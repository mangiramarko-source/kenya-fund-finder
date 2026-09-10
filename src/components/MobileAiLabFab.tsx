import { useNavigate } from "react-router-dom";
import KoraAiLauncher from "@/components/ai-lab/KoraAiLauncher";

const MobileAiLabFab = () => {
  const navigate = useNavigate();
  return <KoraAiLauncher onActivate={() => navigate("/ai-lab")} className="md:hidden fixed right-4 z-50 bottom-[max(1.25rem,env(safe-area-inset-bottom))]" />;
};

export default MobileAiLabFab;
