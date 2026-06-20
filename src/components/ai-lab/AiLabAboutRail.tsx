import { AI_LAB_LABEL, AI_LAB_RAIL_CARD, AI_LAB_SAFETY_LINE } from "@/components/ai-lab/aiLabTheme";
import { AI_LAB_BETA_BADGE } from "@/lib/aiLab/readiness";

const AiLabAboutRail = () => (
  <div className={AI_LAB_RAIL_CARD}>
    <p className={AI_LAB_LABEL}>About AI Lab</p>
    <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
      <li>Website data only — from KenyaFundFinder listings</li>
      <li>Deterministic, no LLM</li>
      <li>{AI_LAB_BETA_BADGE}</li>
      <li>{AI_LAB_SAFETY_LINE}</li>
      <li>Some list filters (e.g. yield thresholds) may not be available yet</li>
    </ul>
  </div>
);

export default AiLabAboutRail;
