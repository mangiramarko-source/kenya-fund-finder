/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISABLE_TURNSTILE_DEV?: string;
  readonly VITE_AI_LAB_GEMINI_ENABLED?: string;
  readonly VITE_AI_LAB_NATURAL_LANGUAGE_ENABLED?: string;
  readonly VITE_AI_LAB_SERVER_AUTHORITATIVE?: string;
  readonly VITE_UNIVERSAL_QUERY_RESOLVER_ENABLED?: string;
  readonly VITE_UNIVERSAL_QUERY_RESOLVER_SHADOW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
