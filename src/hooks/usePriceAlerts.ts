import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AlertAssetType = "stock" | "currency" | "commodity" | "fund" | "new_fund";
export type AlertCondition = "above" | "below" | "change_up" | "change_down" | "change_any";

export interface PriceAlert {
  id: string;
  user_id: string;
  asset_type: AlertAssetType;
  asset_id: string;
  asset_name: string;
  target_price: number;
  condition: AlertCondition;
  baseline_price: number | null;
  notify_email: boolean;
  notify_inapp: boolean;
  is_triggered: boolean;
  is_active: boolean;
  triggered_at: string | null;
  triggered_price: number | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

/**
 * The production evaluator currently has a strict stock-only contract. Keep
 * this guard next to the write so a route cannot accidentally offer an alert
 * that the evaluator will never process.
 */
export const PRICE_ALERT_AVAILABILITY_MESSAGE = "Price alerts are currently available for NSE stocks only.";

export interface NewPriceAlert {
  asset_type: AlertAssetType;
  asset_id: string;
  asset_name: string;
  target_price: number;
  condition: AlertCondition;
  baseline_price?: number | null;
  notify_email?: boolean;
  notify_inapp?: boolean;
}

export const buildPriceAlertInsert = (userId: string, alert: NewPriceAlert) => {
  if (alert.asset_type !== "stock") return null;
  return {
    // `stock_id` is the canonical foreign key used by the evaluator. The
    // compatibility `asset_*` fields remain for the existing UI/history.
    stock_id: alert.asset_id,
    asset_type: alert.asset_type,
    asset_id: alert.asset_id,
    asset_name: alert.asset_name,
    target_price: alert.target_price,
    condition: alert.condition,
    baseline_price: alert.baseline_price ?? null,
    notify_email: alert.notify_email ?? true,
    notify_inapp: alert.notify_inapp ?? true,
    user_id: userId,
  };
};

export function usePriceAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!user) { setAlerts([]); setLoading(false); return; }
    const { data } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts((data as PriceAlert[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const createAlert = async (alert: NewPriceAlert) => {
    if (!user) return { data: null, error: { message: "Not authenticated" } };
    const insert = buildPriceAlertInsert(user.id, alert);
    if (!insert) {
      return { data: null, error: { message: PRICE_ALERT_AVAILABILITY_MESSAGE } };
    }
    const { data, error } = await supabase
      .from("price_alerts")
      .insert(insert)
      .select()
      .single();
    if (!error) await fetchAlerts();
    return { data, error };
  };

  const deleteAlert = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    await fetchAlerts();
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    await supabase.from("price_alerts").update({ is_active: isActive }).eq("id", id);
    await fetchAlerts();
  };

  const resetAlert = async (id: string, baseline_price?: number | null) => {
    const patch: Record<string, unknown> = {
      is_triggered: false,
      triggered_at: null,
      triggered_price: null,
    };
    if (baseline_price != null) patch.baseline_price = baseline_price;
    await supabase.from("price_alerts").update(patch).eq("id", id);
    await fetchAlerts();
  };

  return { alerts, loading, createAlert, deleteAlert, toggleAlert, resetAlert, refetch: fetchAlerts };
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const notifs = (data as Notification[]) || [];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.is_read).length);
  };

  useEffect(() => {
    fetchNotifications();
    if (!user) return;
    const channel = supabase
      .channel(`notifications-rt:${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    await fetchNotifications();
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    await fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    await fetchNotifications();
  };

  return { notifications, unreadCount, markAsRead, markAllRead, deleteNotification, refetch: fetchNotifications };
}
