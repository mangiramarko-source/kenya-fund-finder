import { Shield } from "lucide-react";
import { AI_LAB_LABEL, AI_LAB_RAIL_CARD } from "@/components/ai-lab/aiLabTheme";
import {
  AI_LAB_ACCESS_MODE,
  AI_LAB_BETA_ALLOWLIST,
  resolveAiLabAccess,
} from "@/lib/aiLab/accessGate";
import type { User } from "@supabase/supabase-js";

type Props = {
  user: User;
  isAdmin: boolean;
};

const AiLabAccessCard = ({ user, isAdmin }: Props) => {
  const access = resolveAiLabAccess({ user, isAdmin });

  return (
    <div className={AI_LAB_RAIL_CARD}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="h-3.5 w-3.5 text-stone-600 shrink-0" />
        <h3 className={AI_LAB_LABEL}>Access gate</h3>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-stone-500">Mode</dt>
        <dd className="font-medium text-slate-900">{access.modeLabel}</dd>
        <dt className="text-stone-500">Your access</dt>
        <dd className="font-medium capitalize text-slate-900">{access.reason.replace(/-/g, " ")}</dd>
        <dt className="text-stone-500">Beta allowlist</dt>
        <dd className="tabular-nums text-slate-900">{AI_LAB_BETA_ALLOWLIST.length} emails</dd>
      </dl>
      {AI_LAB_ACCESS_MODE === "admin-only" && (
        <p className="text-[11px] text-stone-600 leading-relaxed mt-2">
          Controlled beta is not enabled. AI Lab remains admin-only until access mode is
          changed in a future deploy.
        </p>
      )}
    </div>
  );
};

export default AiLabAccessCard;
