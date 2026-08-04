import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
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
