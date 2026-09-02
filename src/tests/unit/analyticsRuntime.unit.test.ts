import { describe, expect, it, vi } from "vitest";
import { createAnalyticsUuid, shouldLoadVercelAnalytics } from "@/lib/analyticsRuntime";

describe("analytics runtime compatibility", () => {
  it("creates a UUID when randomUUID is unavailable on an HTTP LAN origin", () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_, index) => { bytes[index] = index + 1; });
        return bytes;
      },
    });

    expect(createAnalyticsUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    vi.unstubAllGlobals();
  });

  it("loads Vercel Analytics only from secure deployments", () => {
    expect(shouldLoadVercelAnalytics("http:")).toBe(false);
    expect(shouldLoadVercelAnalytics("https:")).toBe(true);
  });
});
