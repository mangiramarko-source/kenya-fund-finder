import { describe, it, expect } from "vitest";
import { shouldInitializeAnalytics } from "./analytics";

describe("Analytics environment gate", () => {
  it("blocks a developer dev server on localhost", () => {
    expect(shouldInitializeAnalytics({ MODE: "development", PROD: false }, "localhost")).toBe(false);
    expect(shouldInitializeAnalytics({ MODE: "development", PROD: false }, "127.0.0.1")).toBe(false);
    expect(shouldInitializeAnalytics({ MODE: "development", PROD: false }, "my-app.local")).toBe(false);
  });

  it("blocks any non-production build regardless of host", () => {
    expect(shouldInitializeAnalytics({ MODE: "development", PROD: false }, "app.example.com")).toBe(false);
    expect(shouldInitializeAnalytics({ MODE: "preview", PROD: false }, "app.example.com")).toBe(false);
  });

  it("blocks a production build served on localhost", () => {
    expect(shouldInitializeAnalytics({ MODE: "production", PROD: true }, "localhost")).toBe(false);
    expect(shouldInitializeAnalytics({ MODE: "production", PROD: true }, "127.0.0.1")).toBe(false);
  });

  it("allows a production build on a real host", () => {
    expect(shouldInitializeAnalytics({ MODE: "production", PROD: true }, "app.example.com")).toBe(true);
  });

  it("stays exempt under the test runner so the pipeline is verifiable", () => {
    expect(shouldInitializeAnalytics({ MODE: "test", PROD: false }, "localhost")).toBe(true);
  });
});
