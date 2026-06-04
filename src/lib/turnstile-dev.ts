export function isTurnstileDevBypassEnabled(): boolean {
  return import.meta.env.DEV === true
    && import.meta.env.VITE_DISABLE_TURNSTILE_DEV === "true";
}

export const TURNSTILE_DEV_BYPASS_TOKEN = "dev-bypass-local";
