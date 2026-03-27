import { describe, expect, it } from "vitest";
import { buildSecurityHeaders } from "../../../scripts/securityHeaders.mjs";

const requiredCspDirectives = [
  "script-src",
  "connect-src",
  "img-src",
  "frame-ancestors",
  "object-src 'none'",
  "base-uri 'self'",
];

const deployedTargets = (process.env.HEADER_TEST_URLS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const readHeader = (headers: Headers, name: string) => headers.get(name) ?? headers.get(name.toLowerCase());

describe("frontend security header policy", () => {
  it("defines strict CSP in enforcement mode", () => {
    const headers = buildSecurityHeaders("enforce");
    const csp = headers["Content-Security-Policy"];

    expect(csp).toBeTruthy();

    for (const directive of requiredCspDirectives) {
      expect(csp).toContain(directive);
    }
  });

  it("defines report-only CSP for phased rollout", () => {
    const headers = buildSecurityHeaders("reportOnly");
    const csp = headers["Content-Security-Policy-Report-Only"];

    expect(csp).toBeTruthy();
    expect(csp).toContain("report-uri");

    for (const directive of requiredCspDirectives) {
      expect(csp).toContain(directive);
    }
  });

  it("requires expected security headers at edge", () => {
    const headers = buildSecurityHeaders("enforce");

    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBeTruthy();
    expect(headers["Permissions-Policy"]).toBeTruthy();
  });
});

describe.runIf(deployedTargets.length > 0)("deployed environments expose required security headers", () => {
  for (const target of deployedTargets) {
    it(`validates response headers for ${target}`, async () => {
      const response = await fetch(target, { method: "GET", redirect: "follow" });
      expect(response.ok).toBe(true);

      const hsts = readHeader(response.headers, "Strict-Transport-Security");
      const csp = readHeader(response.headers, "Content-Security-Policy");
      const noSniff = readHeader(response.headers, "X-Content-Type-Options");
      const referrerPolicy = readHeader(response.headers, "Referrer-Policy");
      const permissionsPolicy = readHeader(response.headers, "Permissions-Policy");

      expect(hsts).toContain("max-age=");
      expect(csp).toBeTruthy();
      expect(noSniff).toBe("nosniff");
      expect(referrerPolicy).toBeTruthy();
      expect(permissionsPolicy).toBeTruthy();

      for (const directive of requiredCspDirectives) {
        expect(csp).toContain(directive);
      }
    });
  }
});
