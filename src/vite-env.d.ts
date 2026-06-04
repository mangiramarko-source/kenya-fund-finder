/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISABLE_TURNSTILE_DEV?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
