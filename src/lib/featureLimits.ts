/**
 * Free-plan feature limits. Scaffolding for future monetization — NOT a paywall.
 * Soft limits surface honest UX messages; no payment gates yet.
 */
export const FREE_PLAN = {
  MAX_ACTIVE_ALERTS: 3,
  MAX_WATCHLIST_ITEMS: null as number | null, // unlimited for now
  WEEKLY_EMAIL: true,
} as const;

export type PlanLimits = typeof FREE_PLAN;

export const limitMessages = {
  alertsAtMax: `Free plan includes ${FREE_PLAN.MAX_ACTIVE_ALERTS} active alerts. Disable one to add another.`,
};

/** Whether the user can create another active alert. */
export const canCreateAlert = (activeCount: number) =>
  activeCount < FREE_PLAN.MAX_ACTIVE_ALERTS;
