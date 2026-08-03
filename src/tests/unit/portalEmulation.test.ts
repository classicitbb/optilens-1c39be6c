import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isPortalEmulationActive,
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
});
