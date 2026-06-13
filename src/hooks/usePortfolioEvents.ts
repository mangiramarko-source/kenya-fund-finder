import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { portfolioEventsStorage, type PortfolioEvent } from "@/lib/portfolioEventsStorage";

/**
 * Unified portfolio events for the current user.
 * - Logged-in: reads from `portfolio_events`
 * - Guest: reads from localStorage via `portfolioEventsStorage`
 */
export const usePortfolioEvents = (limit = 100) => {
  const { user } = useAuth();
  const isDemo = !user;
  const [demoEvents, setDemoEvents] = useState<PortfolioEvent[]>([]);

  useEffect(() => {
    if (!isDemo) return;
    const refresh = () => setDemoEvents(portfolioEventsStorage.list().slice(0, limit));
    refresh();
    window.addEventListener("kff:portfolio:changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("kff:portfolio:changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [isDemo, limit]);

  const query = useQuery({
    enabled: !isDemo,
    queryKey: ["portfolio_events", user?.id, limit],
    queryFn: async (): Promise<PortfolioEvent[]> => {
      const { data, error } = await supabase
        .from("portfolio_events")
        .select("*")
        .order("event_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as PortfolioEvent[];
    },
  });

  return {
    events: isDemo ? demoEvents : (query.data ?? []),
    isLoading: isDemo ? false : query.isLoading,
    refetch: query.refetch,
  };
};
