import "@testing-library/jest-dom";

// Provide fake, structurally valid test environment defaults for Supabase configuration
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://test-project.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_test_value_for_unit_tests_only";
process.env.VITE_SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || "test-project";

if (typeof import.meta !== "undefined") {
  (import.meta as any).env = {
    ...((import.meta as any).env || {}),
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    VITE_SUPABASE_PROJECT_ID: process.env.VITE_SUPABASE_PROJECT_ID,
  };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
