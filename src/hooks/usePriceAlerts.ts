import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PriceAlert {
  id: string;
  user_id: string;
  asset_type: "stock" | "currency" | "commodity" | "fund";
  asset_id: string;
  asset_name: string;
  target_price: number;
  condition: "above" | "below";
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
  }, [user]);

  const createAlert = async (alert: {
    asset_type: string;
    asset_id: string;
    asset_name: string;
    target_price: number;
    condition: string;
  }) => {
    if (!user) return { data: null, error: { message: "Not authenticated" } };
    const { data, error } = await supabase
      .from("price_alerts")
      .insert({
        asset_type: alert.asset_type,
        asset_id: alert.asset_id,
        asset_name: alert.asset_name,
        target_price: alert.target_price,
        condition: alert.condition,
        user_id: user.id,
      })
      .select()
      .single();
    if (!error) {
      await fetchAlerts();
    }
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

  return { alerts, loading, createAlert, deleteAlert, toggleAlert, refetch: fetchAlerts };
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
      .channel("notifications-rt")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
