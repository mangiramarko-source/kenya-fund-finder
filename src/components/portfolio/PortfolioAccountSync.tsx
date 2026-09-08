import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/** Keeps every open view of the signed-in portfolio current across devices. */
export default function PortfolioAccountSync() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const queryKey = ["mock_portfolios", userId] as const;
    const channel = supabase
      .channel(`portfolio:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mock_portfolios", filter: `user_id=eq.${userId}` },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [queryClient, userId]);

  return null;
}
