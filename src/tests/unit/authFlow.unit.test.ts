import { describe, expect, it } from "vitest";
import { createAuthHref, readAuthFlowState } from "@/lib/authFlow";

describe("authFlow helper", () => {
  it("builds deep links for professional product signup", () => {
    expect(
      createAuthHref({
        mode: "signup",
        audience: "professional",
        intent: "products",
        step: "details",
        redirect: "/store",
      }),
    ).toBe("/auth?mode=signup&audience=professional&intent=products&step=details&redirect=%2Fstore");
  });

  it("drops unsafe redirects when creating auth links", () => {
    expect(
      createAuthHref({
        mode: "signin",
        redirect: "https://evil.example",
      }),
    ).toBe("/auth?mode=signin");
  });

  it("reads state from query params with safe redirect handling", () => {
    const state = readAuthFlowState(
      new URLSearchParams("mode=signup&audience=patient&intent=knowledge&step=success&redirect=%2Fpatients"),
    );

    expect(state).toEqual({
      mode: "signup",
      audience: "patient",
      intent: "knowledge",
      step: "success",
      redirect: "/patients",
    });
  });
});
