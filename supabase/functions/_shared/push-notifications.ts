import webpush from "npm:web-push@3.6.7";

type AdminClient = any;

type PushNotification = {
  event_key: string;
  notification_id?: string | null;
  user_id: string;
  title: string;
  message: string;
  type: string;
};

export async function dispatchPriceAlertPushes(admin: AdminClient, notification: PushNotification) {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) return { sent: 0, skipped: "not_configured" as const };

  const [{ data: preference }, { data: presence }, { data: subscriptions }] = await Promise.all([
    admin.from("communication_preferences").select("price_alert_push,price_alert_push_consented_at").eq("user_id", notification.user_id).maybeSingle(),
    admin.from("notification_presence").select("last_seen_at").eq("user_id", notification.user_id).maybeSingle(),
    admin.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", notification.user_id).eq("is_active", true),
  ]);
  if (!preference?.price_alert_push || !preference.price_alert_push_consented_at || !(subscriptions ?? []).length) return { sent: 0, skipped: "not_enabled" as const };

  const isActiveInApp = presence?.last_seen_at && Date.now() - new Date(presence.last_seen_at).getTime() < 90_000;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  for (const subscription of subscriptions ?? []) {
    const { data: dispatch } = await admin.from("push_notification_dispatches")
      .insert({ event_key: notification.event_key, notification_id: notification.notification_id ?? null, push_subscription_id: subscription.id, status: isActiveInApp ? "suppressed" : "pending" })
      .select("id").maybeSingle();
    if (!dispatch || isActiveInApp) continue;
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
        title: notification.title, body: notification.message, tag: `kff-${notification.event_key}`, url: "/alerts",
      }), { TTL: 300 });
      await admin.from("push_notification_dispatches").update({ status: "sent", attempted_at: new Date().toISOString() }).eq("id", dispatch.id);
      sent += 1;
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number }).statusCode);
      const invalid = statusCode === 404 || statusCode === 410;
      await admin.from("push_notification_dispatches").update({ status: invalid ? "invalid" : "failed", attempted_at: new Date().toISOString(), provider_response: String(error).slice(0, 500) }).eq("id", dispatch.id);
      if (invalid) await admin.from("push_subscriptions").update({ is_active: false, disabled_at: new Date().toISOString() }).eq("id", subscription.id);
    }
  }
  return { sent, skipped: null };
}
