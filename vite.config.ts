import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function validateSupabaseBuildEnv(mode: string) {
  const env = loadEnv(mode, process.cwd(), "");
  const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const projectId = env.VITE_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID;

  if (!url || typeof url !== "string" || !url.trim()) {
    throw new Error(
      "\n❌ [FAIL-CLOSED] Missing VITE_SUPABASE_URL. A valid HTTPS Supabase URL is required for building.\n"
    );
  }
  const trimmedUrl = url.trim();
  if (trimmedUrl.startsWith("eyJ") || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(trimmedUrl)) {
    throw new Error(
      "\n❌ [FAIL-CLOSED] Malformed VITE_SUPABASE_URL. Expected https://<project>.supabase.co\n"
    );
  }

  // Derive and validate project ID
  const urlMatch = trimmedUrl.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  const derivedRef = urlMatch && urlMatch[1] ? urlMatch[1].toLowerCase() : "";
  if (projectId && typeof projectId === "string" && projectId.trim()) {
    if (projectId.trim().toLowerCase() !== derivedRef) {
      throw new Error(
        "\n❌ [FAIL-CLOSED] VITE_SUPABASE_PROJECT_ID mismatch: Supplied project ID does not match the project reference in VITE_SUPABASE_URL.\n"
      );
    }
  }

  if (!key || typeof key !== "string" || !key.trim()) {
    throw new Error(
      "\n❌ [FAIL-CLOSED] Missing VITE_SUPABASE_PUBLISHABLE_KEY. An active publishable key is required.\n"
    );
  }
  const trimmedKey = key.trim();
  if (trimmedKey.startsWith("eyJ")) {
    throw new Error(
      "\n❌ [FAIL-CLOSED] Legacy JWT key or ciphertext envelope detected in VITE_SUPABASE_PUBLISHABLE_KEY (starts with 'eyJ'). Legacy keys are disabled on Supabase. Must provide an active 'sb_publishable_*' key.\n"
    );
  }
  if (trimmedKey.startsWith("sb_secret_") || trimmedKey.toLowerCase().includes("service_role")) {
    throw new Error(
      "\n❌ [FAIL-CLOSED] Security violation: Secret or service_role key detected in client VITE_SUPABASE_PUBLISHABLE_KEY.\n"
    );
  }
  if (!trimmedKey.startsWith("sb_publishable_")) {
    throw new Error(
      "\n❌ [FAIL-CLOSED] Malformed VITE_SUPABASE_PUBLISHABLE_KEY. Key must start with 'sb_publishable_'.\n"
    );
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "fail-closed-supabase-validator",
      configResolved(config) {
        if (config.command === "build") {
          validateSupabaseBuildEnv(mode);
        }
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target Safari 14+ to support older iPhones (e.g. iPhone 7 Plus on iOS 15).
    // Without this, Vite defaults to esnext which iOS 15 Safari cannot run.
    target: ["es2019", "safari14"],
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Keep React + scheduler + react-dom + tanstack-query together.
          // Splitting them caused a runtime error where react-query lost
          // its React reference ("observer.getOptimisticResult is not a function").
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("scheduler") ||
            id.includes("@tanstack") ||
            // Radix primitives call React.forwardRef at module top-level.
            // If they land in a separate chunk that loads before react-core
            // finishes initializing, we get:
            //   "Cannot read properties of undefined (reading 'forwardRef')"
            // Keep them bundled with React to guarantee init order.
            id.includes("@radix-ui")
          )
            return "react-core";
          if (id.includes("@supabase")) return "supabase";
          // NOTE: Do NOT manually split recharts/d3-* into a "charts" chunk.
          // Doing so creates a circular init between the charts chunk and
          // react-core, producing a runtime "Cannot access 'S' before
          // initialization" TDZ error that white-screens the app on prod.
          // Let Rollup decide where recharts/d3 go.
          // Bundle ALL lucide icons together — splitting them produced 20+ tiny
          // ~1KB chunks that wasted HTTP overhead and stalled the network.
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-router")) return "router";
        },
      },
    },
  },
}));
