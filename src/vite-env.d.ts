/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISABLE_TURNSTILE_DEV?: string;
  readonly VITE_AI_LAB_GEMINI_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
