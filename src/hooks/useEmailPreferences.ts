import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRef } from "react";

export interface EmailPreferences {
  price_alert_email: boolean;
  price_alert_inapp: boolean;
  price_alert_push: boolean;
  market_brief_email: boolean;
  portfolio_daily_inapp: boolean;
  watchlist_mover_inapp: boolean;
  mmf_yield_inapp: boolean;
  tbill_auction_inapp: boolean;
  market_brief_inapp: boolean;
  admin_broadcast_inapp: boolean;
}
export type WelcomeEmailChoices = Pick<EmailPreferences, "price_alert_email" | "market_brief_email">;
export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  price_alert_email: false,
  price_alert_inapp: true,
  price_alert_push: false,
  market_brief_email: false,
  portfolio_daily_inapp: true,
  watchlist_mover_inapp: true,
  mmf_yield_inapp: true,
  tbill_auction_inapp: true,
  market_brief_inapp: true,
  admin_broadcast_inapp: true,
};
const baseColumns = "user_id,price_alert_email,price_alert_inapp,price_alert_push,market_brief_email,email_welcome_completed" as const;
const baseConsentColumns = `${baseColumns},price_alert_email_consented_at,market_brief_email_consented_at` as const;
const expandedConsentColumns = `${baseConsentColumns},portfolio_daily_inapp,watchlist_mover_inapp,mmf_yield_inapp,tbill_auction_inapp,market_brief_inapp,admin_broadcast_inapp` as const;

const DIRECT_PREFERENCE_KEYS = [
  "price_alert_inapp",
  "price_alert_push",
  "portfolio_daily_inapp",
  "watchlist_mover_inapp",
  "mmf_yield_inapp",
  "tbill_auction_inapp",
  "market_brief_inapp",
  "admin_broadcast_inapp",
] as const;

function effectivePreferences<T extends Partial<EmailPreferences> & {
  price_alert_email?: boolean;
  market_brief_email?: boolean;
  price_alert_email_consented_at?: string | null;
  market_brief_email_consented_at?: string | null;
}>(row: T): T {
  return {
    ...row,
    price_alert_email: row.price_alert_email === true && Boolean(row.price_alert_email_consented_at),
    market_brief_email: row.market_brief_email === true && Boolean(row.market_brief_email_consented_at),
  };
}

export function useEmailPreferences() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const savingRef = useRef(false);
  const key = ["communication-preferences", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async () => {
      const primary = await supabase
        .from("communication_preferences")
        .select(expandedConsentColumns)
        .eq("user_id", user!.id)
        .single();
      if (!primary.error && primary.data) {
        return effectivePreferences(primary.data);
      }
      if (primary.error) {
        const fallback = await supabase
          .from("communication_preferences")
          .select(baseConsentColumns)
          .eq("user_id", user!.id)
          .single();
        if (!fallback.error && fallback.data) {
          return effectivePreferences(fallback.data);
        }
      }
      throw new Error("Couldn't load your email choices. Please try again.");
    },
  });
  const mutation = useMutation({
    onMutate: async ({ userId }) => {
      // A slow pre-save read must not overwrite a newly confirmed choice.
      await cache.cancelQueries({ queryKey: ["communication-preferences", userId] });
    },
    mutationFn: async ({ userId, patch }: { userId: string; patch: Partial<EmailPreferences> & { email_welcome_completed?: boolean } }) => {
      const hasDirectKey = DIRECT_PREFERENCE_KEYS.some((k) => Object.prototype.hasOwnProperty.call(patch, k));
      if (hasDirectKey) {
        const preferencePatch: Record<string, boolean> = {};
        for (const directKey of DIRECT_PREFERENCE_KEYS) {
          const val = patch[directKey];
          if (typeof val === "boolean") preferencePatch[directKey] = val;
        }
        const primary = await supabase
          .from("communication_preferences")
          .update(preferencePatch)
          .eq("user_id", userId)
          .select(expandedConsentColumns)
          .single();
        if (!primary.error && primary.data) {
          return effectivePreferences(primary.data);
        }
        if (primary.error) {
          const fallback = await supabase
            .from("communication_preferences")
            .update(preferencePatch)
            .eq("user_id", userId)
            .select(baseConsentColumns)
            .single();
          if (!fallback.error && fallback.data) {
            return effectivePreferences(fallback.data);
          }
        }
        throw new Error("Your choices weren't saved. Please try again.");
      }
      const { data, error } = await supabase.functions.invoke("update-communication-preferences", { body: patch });
      if (error || !data?.preferences) throw new Error("Your choices weren't saved. Please try again.");
      return effectivePreferences(data.preferences);
    },
    onSuccess: (data, variables) => cache.setQueryData(["communication-preferences", variables.userId], data),
  });
  const save = async (patch: Partial<EmailPreferences> & { email_welcome_completed?: boolean }) => {
    if (!user || savingRef.current) return false;
    savingRef.current = true;
    try {
      await mutation.mutateAsync({ userId: user.id, patch });
      return true;
    } catch {
      return false;
    } finally {
      savingRef.current = false;
    }
  };
  return {
    prefs: query.data ? { ...DEFAULT_EMAIL_PREFERENCES, ...query.data } : DEFAULT_EMAIL_PREFERENCES,
    loading: Boolean(user) && query.isPending,
    saving: mutation.isPending,
    needsWelcome: (query.data as { email_welcome_completed?: boolean } | undefined)?.email_welcome_completed === false,
    error: query.error?.message ?? mutation.error?.message ?? null,
    retry: () => { mutation.reset(); return query.refetch(); },
    updatePref: (key: keyof EmailPreferences, value: boolean) => save({ [key]: value }),
    saveEmailChoices: (choices: WelcomeEmailChoices) => save(choices),
    completeWelcome: () => save({ email_welcome_completed: true }),
    saveWelcome: (choices: WelcomeEmailChoices) => save({ ...choices, email_welcome_completed: true }),
  };
}
