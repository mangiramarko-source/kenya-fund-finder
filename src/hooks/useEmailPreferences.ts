import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRef } from "react";

export interface EmailPreferences {
  price_alert_email: boolean;
  price_alert_inapp: boolean;
  market_brief_email: boolean;
}
export type WelcomeEmailChoices = Pick<EmailPreferences, "price_alert_email" | "market_brief_email">;
export const DEFAULT_EMAIL_PREFERENCES: EmailPreferences = {
  price_alert_email: false, price_alert_inapp: true, market_brief_email: false,
};
const columns = "user_id,price_alert_email,price_alert_inapp,market_brief_email,email_welcome_completed" as const;

export function useEmailPreferences() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const savingRef = useRef(false);
  const key = ["communication-preferences", user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("communication_preferences")
        .select(columns).eq("user_id", user!.id).single();
      if (error || !data) throw new Error("Couldn't load your email choices. Please try again.");
      return data;
    },
  });
  const mutation = useMutation({
    onMutate: async ({ userId }) => {
      // A slow pre-save read must not overwrite a newly confirmed choice.
      await cache.cancelQueries({ queryKey: ["communication-preferences", userId] });
    },
    mutationFn: async ({ userId, patch }: { userId: string; patch: Partial<EmailPreferences> & { email_welcome_completed?: boolean } }) => {
      const { data, error } = await supabase.from("communication_preferences")
        .update(patch).eq("user_id", userId).select(columns).single();
      if (error || !data) throw new Error("Your choices weren't saved. Please try again.");
      return data;
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
    prefs: query.data ?? DEFAULT_EMAIL_PREFERENCES,
    loading: Boolean(user) && query.isPending,
    saving: mutation.isPending,
    needsWelcome: query.data?.email_welcome_completed === false,
    error: query.error?.message ?? mutation.error?.message ?? null,
    retry: () => { mutation.reset(); return query.refetch(); },
    updatePref: (key: keyof EmailPreferences, value: boolean) => save({ [key]: value }),
    saveWelcome: (choices: WelcomeEmailChoices) => save({ ...choices, email_welcome_completed: true }),
  };
}
