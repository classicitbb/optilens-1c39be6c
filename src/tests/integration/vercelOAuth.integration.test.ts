import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const { rewrites } = JSON.parse(
  readFileSync(new URL("../../../vercel.json", import.meta.url), "utf8"),
);

describe("Vercel OAuth routing", () => {
  it("proxies OAuth paths to the Lovable broker before the SPA fallback", () => {
    const oauthIndex = rewrites.findIndex(
      (rule: { source: string }) => rule.source === "/~oauth/:match*",
    );
    const spaIndex = rewrites.findIndex(
      (rule: { destination: string }) => rule.destination === "/index.html",
    );

    expect(oauthIndex).toBeGreaterThanOrEqual(0);
    expect(spaIndex).toBeGreaterThan(oauthIndex);
    expect(rewrites[oauthIndex].destination).toBe(
      "https://classicvisions.lovable.app/~oauth/:match*",
    );
  });
});