import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LivePriceAlertCard } from "./LivePriceAlertCard";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  assetName?: string;
  assetSymbol?: string;
}

type NotificationContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  openNotification: (notification: AppNotification) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [livePriceAlert, setLivePriceAlert] = useState<AppNotification | null>(null);
  const seenIds = useRef(new Set<string>());

  const hydrateNotifications = useCallback(async (items: AppNotification[]) => {
    const stockIds = [...new Set(items.map((item) => item.type === "price_alert" ? item.metadata?.stock_id : null).filter((id): id is string => typeof id === "string"))];
    if (!stockIds.length) return items;
    const { data } = await supabase.from("stocks").select("id,name,symbol").in("id", stockIds);
    const stocks = new Map((data ?? []).map((stock) => [stock.id, stock]));
    return items.map((item) => {
      const stockId = typeof item.metadata?.stock_id === "string" ? item.metadata.stock_id : null;
      const stock = stockId ? stocks.get(stockId) : null;
      return stock ? { ...item, assetName: stock.name, assetSymbol: stock.symbol } : item;
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLivePriceAlert(null); seenIds.current.clear(); return; }
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    const next = await hydrateNotifications((data as AppNotification[] | null) ?? []);
    setNotifications(next);
    next.forEach((notification) => seenIds.current.add(notification.id));
  }, [hydrateNotifications, user]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }, []);
  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  }, [user]);
  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((items) => items.filter((item) => item.id !== id));
  }, []);
  const openNotification = useCallback(async (notification: AppNotification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    if (notification.type === "price_alert") navigate("/alerts");
  }, [markAsRead, navigate]);

  useEffect(() => {
    void fetchNotifications();
    if (!user) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timer: number | null = null;
    const touchPresence = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.from("notification_presence").upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
    };
    const subscribe = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.access_token) await supabase.realtime.setAuth(session.session.access_token);
      channel = supabase.channel(`user:${user.id}:notifications`, { config: { private: true } })
        .on("broadcast", { event: "notification_created" }, async (event) => {
          const id = String((event.payload as { id?: string }).id ?? "");
          if (!id || seenIds.current.has(id)) return;
          const { data } = await supabase.from("notifications").select("*").eq("id", id).maybeSingle();
          if (!data) return;
          const [notification] = await hydrateNotifications([data as AppNotification]);
          if (!notification) return;
          seenIds.current.add(notification.id);
          setNotifications((items) => [notification, ...items.filter((item) => item.id !== notification.id)]);
          if (notification.type === "price_alert") {
            setLivePriceAlert(notification);
          } else {
            toast(notification.title, { description: notification.message });
          }
        }).subscribe();
    };
    touchPresence();
    timer = window.setInterval(touchPresence, 45_000);
    document.addEventListener("visibilitychange", touchPresence);
    void subscribe();
    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", touchPresence);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, hydrateNotifications, user]);

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter((notification) => !notification.is_read).length,
    markAsRead, markAllRead, deleteNotification, openNotification,
  }), [deleteNotification, markAllRead, markAsRead, notifications, openNotification]);
  return <NotificationContext.Provider value={value}>{children}<LivePriceAlertCard notification={livePriceAlert} onDismiss={() => setLivePriceAlert(null)} onView={(notification) => { setLivePriceAlert(null); void openNotification(notification); }} /></NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used inside NotificationProvider");
  return context;
}
