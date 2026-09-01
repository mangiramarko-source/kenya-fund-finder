import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AlertAssetType = "stock" | "fund" | "currency" | "commodity";
export type AlertCondition = "above" | "below";

export interface PriceAlert {
  id: string;
  user_id: string;
  asset_type: AlertAssetType;
  asset_id: string;
  stock_id: string | null;
  asset_name: string;
  asset_unit: string;
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
  trigger_count: number;
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

export type AlertDraft = {
  asset_type: AlertAssetType;
  asset_id: string;
  asset_name: string;
  asset_unit?: string;
  target_price: number;
  condition: AlertCondition;
  baseline_price?: number | null;
  notify_email?: boolean;
  notify_inapp?: boolean;
};

export const buildPriceAlertInsert = (userId: string, alert: AlertDraft) => ({
  user_id: userId,
  stock_id: alert.asset_type === "stock" ? alert.asset_id : null,
  asset_type: alert.asset_type,
  asset_id: alert.asset_id,
  asset_name: alert.asset_name,
  asset_unit: alert.asset_unit ?? "KES",
  target_price: alert.target_price,
  condition: alert.condition,
  baseline_price: alert.baseline_price ?? null,
  notify_email: alert.notify_email ?? true,
  notify_inapp: alert.notify_inapp ?? true,
});

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

  const createAlert = async (alert: AlertDraft) => {
    if (!user) return { data: null, error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("price_alerts")
      .insert(buildPriceAlertInsert(user.id, alert))
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

  const updateAlert = async (id: string, changes: Omit<AlertDraft, "asset_type" | "asset_id" | "asset_name" | "asset_unit">) => {
    if (!user) return { data: null, error: { message: "Not authenticated" } };
    const existing = alerts.find((alert) => alert.id === id);
    if (!existing) return { data: null, error: { message: "Alert not found" } };

    if (existing.is_triggered) {
      const replacement = await createAlert({
        asset_type: existing.asset_type,
        asset_id: existing.asset_id,
        asset_name: existing.asset_name,
        asset_unit: existing.asset_unit,
        target_price: changes.target_price,
        condition: changes.condition,
        baseline_price: changes.baseline_price ?? existing.baseline_price,
        notify_email: changes.notify_email,
        notify_inapp: changes.notify_inapp,
      });
      if (replacement.error) return replacement;
      const { error } = await supabase.from("price_alerts").delete().eq("id", id).eq("user_id", user.id);
      if (!error) await fetchAlerts();
      return { data: replacement.data, error };
    }

    const { data, error } = await supabase
      .from("price_alerts")
      .update({
        target_price: changes.target_price,
        condition: changes.condition,
        baseline_price: changes.baseline_price ?? existing.baseline_price,
        notify_email: changes.notify_email ?? existing.notify_email,
        notify_inapp: changes.notify_inapp ?? existing.notify_inapp,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();
    if (!error) await fetchAlerts();
    return { data, error };
  };

  const resetAlert = async (id: string, baseline_price?: number | null) => {
    if (!user) return { error: { message: "Not authenticated" } };
    const existing = alerts.find((alert) => alert.id === id);
    if (!existing) return { error: { message: "Alert not found" } };

    // Trigger/evaluation state is service-controlled. Reset a one-shot alert by
    // creating a fresh user-owned alert, then remove the completed alert only
    // after the replacement exists.
    const { error: createError } = await supabase.from("price_alerts").insert({
      user_id: user.id,
      asset_type: existing.asset_type,
      asset_id: existing.asset_id,
      asset_name: existing.asset_name,
      asset_unit: existing.asset_unit,
      condition: existing.condition,
      target_price: existing.target_price,
      notify_email: existing.notify_email,
      notify_inapp: existing.notify_inapp,
      is_active: true,
      baseline_price: baseline_price ?? existing.baseline_price,
    });
    if (createError) return { error: createError };

    const { error: deleteError } = await supabase.from("price_alerts").delete().eq("id", id);
    await fetchAlerts();
    return { error: deleteError };
  };

  return { alerts, loading, createAlert, updateAlert, deleteAlert, toggleAlert, resetAlert, refetch: fetchAlerts };
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
    const timer = window.setInterval(fetchNotifications, 60_000);
    return () => window.clearInterval(timer);
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
