import { supabase } from "@/integrations/supabase/client";
import type { QuerySemanticFrameV1 } from "../../../supabase/functions/_shared/universal-query";

export type ResolutionTelemetryOutcome =
  | "resolved"
  | "ambiguous"
  | "not_found"
  | "clarification_selected"
  | "shadow_disagreement"
  | "wrong_resolution";

export function redactQueryForTelemetry(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "[url]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\+?\d[\d\s()-]{7,}\d/g, "[number]")
    .replace(/\b(?:kes|ksh|kshs|sh)?\s*\d[\d,.]*(?:\s*[km])?\b/gi, "[amount]")
    .replace(/\s+/g, " ")
    .slice(0, 320);
}

export interface ResolutionTelemetryEvent {
  query: string;
  frame: QuerySemanticFrameV1;
  outcome: ResolutionTelemetryOutcome;
  candidateIds?: string[];
  selectedEntityId?: string;
  shadowResult?: Record<string, unknown>;
}

/** Best-effort by design: understanding telemetry must never block an answer. */
export async function recordQueryResolutionTelemetry(event: ResolutionTelemetryEvent): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke("ai-lab-assist", {
      body: {
        mode: "telemetry",
        telemetry: {
          ...event,
          query: redactQueryForTelemetry(event.query),
          candidateIds: event.candidateIds?.slice(0, 8),
        },
      },
    });
    return !error && Boolean((data as { ok?: boolean } | null)?.ok);
  } catch {
    return false;
  }
}
