export const PRICE_ALERT_AUTOMATION_STATUS = "Automatic price-alert delivery is not currently active.";

export const priceAlertMessaging = {
  seoDescription: `Set NSE stock price targets and manage alert preferences. ${PRICE_ALERT_AUTOMATION_STATUS}`,
  settingsTitle: "Price-alert email preference",
  settingsDescription: `Save your email preference for future NSE stock alert notifications. ${PRICE_ALERT_AUTOMATION_STATUS}`,
  onboardingTitle: "Price alert emails",
  onboardingDescription: `Save my email preference for future NSE stock alert notifications. ${PRICE_ALERT_AUTOMATION_STATUS}`,
  targetSetup: `Choose an asset and set a target. ${PRICE_ALERT_AUTOMATION_STATUS}`,
  triggeredEmptyState: "Triggered alerts appear here after an alert is evaluated and meets its target.",
  devicePrompt: "Enable device notifications for future price-alert notifications when Kenya Fund Finder is closed.",
} as const;
