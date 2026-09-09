import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LivePriceAlertCard } from "./LivePriceAlertCard";
import { toast } from "sonner";
import { getFundManagerLogoUrl } from "@/lib/fundBranding";
import { getStockLogoUrl } from "@/lib/stockBranding";

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
  assetType?: "stock" | "fund" | "currency" | "commodity" | "portfolio";
  assetVisualUrl?: string;
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
const shownPriceAlertStorageKey = "kff:shown-price-alert-modal-ids";

function readShownPriceAlertIds() {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(shownPriceAlertStorageKey) ?? "[]");
    return new Set(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [livePriceAlert, setLivePriceAlert] = useState<AppNotification | null>(null);
  const seenIds = useRef(new Set<string>());
  const shownPriceAlertIds = useRef(readShownPriceAlertIds());

  const markPriceAlertModalShown = useCallback((notificationId: string) => {
    shownPriceAlertIds.current.add(notificationId);
    try {
      window.sessionStorage.setItem(shownPriceAlertStorageKey, JSON.stringify([...shownPriceAlertIds.current]));
    } catch {
      // The live alert remains functional when session storage is unavailable.
    }
  }, []);

  const hydrateNotifications = useCallback(async (items: AppNotification[]) => {
    const priceAlerts = items.filter((item) => item.type === "price_alert");
    const idsFor = (assetType: "stock" | "fund" | "currency" | "commodity") => [...new Set(priceAlerts
      .map((item) => item.metadata?.asset_type === assetType ? item.metadata.asset_id : assetType === "stock" ? item.metadata?.stock_id : null)
      .filter((id): id is string => typeof id === "string"))];
    const [stockResult, fundResult, currencyResult, commodityResult] = await Promise.all([
      idsFor("stock").length ? supabase.from("stocks").select("id,name,symbol,logo_url").in("id", idsFor("stock")) : Promise.resolve({ data: [] }),
      idsFor("fund").length ? supabase.from("funds").select("id,name,manager,logo_url").in("id", idsFor("fund")) : Promise.resolve({ data: [] }),
      idsFor("currency").length ? supabase.from("exchange_rates").select("id,currency_code,currency_name").in("id", idsFor("currency")) : Promise.resolve({ data: [] }),
      idsFor("commodity").length ? supabase.from("commodities").select("id,name,symbol").in("id", idsFor("commodity")) : Promise.resolve({ data: [] }),
    ]);
    const stocks = new Map((stockResult.data ?? []).map((stock) => [stock.id, stock]));
    const funds = new Map((fundResult.data ?? []).map((fund) => [fund.id, fund]));
    const currencies = new Map((currencyResult.data ?? []).map((currency) => [currency.id, currency]));
    const commodities = new Map((commodityResult.data ?? []).map((commodity) => [commodity.id, commodity]));

    return items.map((item) => {
      if (item.type !== "price_alert") return item;
      const assetType = item.metadata?.asset_type;
      const assetId = typeof item.metadata?.asset_id === "string" ? item.metadata.asset_id : null;
      const stockId = assetType === "stock" ? assetId : typeof item.metadata?.stock_id === "string" ? item.metadata.stock_id : null;
      const stock = stockId ? stocks.get(stockId) : null;
      if (stock) return { ...item, assetType: "stock" as const, assetName: stock.name, assetSymbol: stock.symbol, assetVisualUrl: getStockLogoUrl(stock.symbol, stock.logo_url) || undefined };
      const fund = assetType === "fund" && assetId ? funds.get(assetId) : null;
      if (fund) return { ...item, assetType: "fund" as const, assetName: fund.name, assetVisualUrl: getFundManagerLogoUrl(fund.manager, fund.logo_url) };
      const currency = assetType === "currency" && assetId ? currencies.get(assetId) : null;
      if (currency) return { ...item, assetType: "currency" as const, assetName: `${currency.currency_code}/KES · ${currency.currency_name}`, assetSymbol: currency.currency_code };
      const commodity = assetType === "commodity" && assetId ? commodities.get(assetId) : null;
      if (commodity) return { ...item, assetType: "commodity" as const, assetName: commodity.name, assetSymbol: commodity.symbol };
      return { ...item, assetType: assetType === "stock" || assetType === "fund" || assetType === "currency" || assetType === "commodity" ? assetType : undefined, assetName: typeof item.metadata?.asset_name === "string" ? item.metadata.asset_name : item.assetName };
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!userId) { setNotifications([]); setLivePriceAlert(null); seenIds.current.clear(); return; }
    const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);
    const next = await hydrateNotifications((data as AppNotification[] | null) ?? []);
    setNotifications(next);
    next.forEach((notification) => seenIds.current.add(notification.id));
    const newestUnshownPriceAlert = next.find((notification) => notification.type === "price_alert" && !notification.is_read && !shownPriceAlertIds.current.has(notification.id));
    if (newestUnshownPriceAlert) {
      markPriceAlertModalShown(newestUnshownPriceAlert.id);
      setLivePriceAlert(newestUnshownPriceAlert);
    }
  }, [hydrateNotifications, markPriceAlertModalShown, userId]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, is_read: true } : item));
  }, []);
  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  }, [userId]);
  const deleteNotification = useCallback(async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((items) => items.filter((item) => item.id !== id));
  }, []);
  const openNotification = useCallback(async (notification: AppNotification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    if (notification.type === "price_alert") navigate("/alerts");
    if (notification.type === "portfolio_daily") navigate("/portfolio");
  }, [markAsRead, navigate]);

  useEffect(() => {
    void fetchNotifications();
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let timer: number | null = null;
    const touchPresence = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.from("notification_presence").upsert({ user_id: userId, last_seen_at: new Date().toISOString() });
    };
    const subscribe = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.access_token) await supabase.realtime.setAuth(session.session.access_token);
      channel = supabase.channel(`user:${userId}:notifications`, { config: { private: true } })
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
            markPriceAlertModalShown(notification.id);
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
  }, [fetchNotifications, hydrateNotifications, markPriceAlertModalShown, userId]);

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
