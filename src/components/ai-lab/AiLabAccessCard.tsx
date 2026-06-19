import { Shield } from "lucide-react";
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
    <div className="rounded-xl border border-border bg-card/60 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Shield className="h-3.5 w-3.5 text-accent shrink-0" />
        <h3 className="text-xs font-semibold">Access gate</h3>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-muted-foreground">Mode</dt>
        <dd className="font-medium">{access.modeLabel}</dd>
        <dt className="text-muted-foreground">Your access</dt>
        <dd className="font-medium capitalize">{access.reason.replace(/-/g, " ")}</dd>
        <dt className="text-muted-foreground">Beta allowlist</dt>
        <dd className="tabular-nums">{AI_LAB_BETA_ALLOWLIST.length} emails</dd>
      </dl>
      {AI_LAB_ACCESS_MODE === "admin-only" && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Controlled beta is not enabled. AI Lab remains admin-only until access mode is
          changed in a future deploy.
        </p>
      )}
    </div>
  );
};

export default AiLabAccessCard;
