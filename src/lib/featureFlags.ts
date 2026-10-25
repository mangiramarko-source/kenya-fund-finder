/**
 * Application feature flags.
 * Controlled via Vite environment variables (VITE_*).
 */

export const isAiLabEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_AI_LAB === "true";
};
