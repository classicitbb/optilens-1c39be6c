import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isPortalEmulationActive,
  isPortalEmulationTab,
  startPortalEmulation,
  stopPortalEmulation,
} from "@/lib/portalEmulation";

describe("portal emulation state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    stopPortalEmulation();
  });

  it("marks signed-in-as sessions so login tracking can exclude them", () => {
    expect(isPortalEmulationActive()).toBe(false);

    startPortalEmulation({
      userId: "customer-user-id",
      label: "Customer",
      mode: "signed-in-as",
    });

    expect(isPortalEmulationActive()).toBe(true);
  });

  it("only treats the tab that redeemed an emulation token as tab-scoped", () => {
    expect(isPortalEmulationTab()).toBe(false);

    window.history.replaceState({}, "", "/auth?emulate_token_hash=abc&emulate_user_id=u1");
    expect(isPortalEmulationTab()).toBe(true);

    // Survives navigation away from the preview URL inside the same tab.
    window.history.replaceState({}, "", "/profile");
    expect(isPortalEmulationTab()).toBe(true);

    // A fresh tab (no sessionStorage marker) stays on shared localStorage.
    window.sessionStorage.clear();
    expect(isPortalEmulationTab()).toBe(false);
  });
});
