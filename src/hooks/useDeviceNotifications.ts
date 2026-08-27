import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEmailPreferences } from "@/hooks/useEmailPreferences";

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const toUint8Array = (value: string) => {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

export function useDeviceNotifications() {
  const { prefs, retry } = useEmailPreferences();
  const supported = typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
  const enable = async () => {
    if (!supported) { toast.info("Device notifications are not supported by this browser. You can still view alerts in Kenya Fund Finder."); return false; }
    if (!vapidPublicKey) { toast.info("Device notifications are being prepared. In-app alerts are available now."); return false; }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { toast.info("Device notifications were not enabled. You can change this in your browser settings later."); return false; }
      const registration = await navigator.serviceWorker.register("/kff-notifications-sw.js");
      const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8Array(vapidPublicKey) });
      const { error } = await supabase.functions.invoke("manage-push-subscription", { body: { action: "subscribe", subscription: subscription.toJSON() } });
      if (error) { toast.error("We couldn't enable device notifications. Please try again."); return false; }
      await retry();
      toast.success("Device notifications enabled for price alerts.");
      return true;
    } catch {
      toast.error("We couldn't enable device notifications. Please try again.");
      return false;
    }
  };
  const disable = async () => {
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      await registration?.pushManager.getSubscription().then((subscription) => subscription?.unsubscribe());
      const { error } = await supabase.functions.invoke("manage-push-subscription", { body: { action: "unsubscribe" } });
      if (error) { toast.error("We couldn't turn off device notifications. Please try again."); return false; }
      await retry();
      return true;
    } catch {
      toast.error("We couldn't turn off device notifications. Please try again.");
      return false;
    }
  };
  return { enabled: prefs.price_alert_push, supported, enable, disable };
}
