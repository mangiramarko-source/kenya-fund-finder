import type { AppNotification } from "./NotificationProvider";
import { TopNotificationBanner } from "./TopNotificationBanner";

type Props = {
  notification: AppNotification | null;
  unreadCount?: number;
  onDismiss: () => void;
  onView: (notification: AppNotification) => void;
  onOpenDrawer?: () => void;
};

export function LivePriceAlertCard({ notification, unreadCount, onDismiss, onView, onOpenDrawer }: Props) {
  return (
    <TopNotificationBanner
      notification={notification}
      unreadCount={unreadCount}
      onDismiss={onDismiss}
      onView={onView}
      onOpenDrawer={onOpenDrawer}
    />
  );
}
