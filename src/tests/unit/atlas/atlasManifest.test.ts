import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ATLAS_CONFIG, buildAtlasManifest } from "@/features/atlas/config";
import { listAtlasSpaces } from "@/features/atlas/spaces";

const pub = (file: string) => path.resolve(process.cwd(), "public", file);

describe("atlas install manifest", () => {
  it("matches the config (regenerate with npm run atlas:assets)", () => {
    const onDisk = JSON.parse(fs.readFileSync(pub("atlas.webmanifest"), "utf8"));
    expect(onDisk).toEqual(JSON.parse(JSON.stringify(buildAtlasManifest())));
  });

  it("is scoped to /atlas/, standalone, and ships every declared icon", () => {
    const manifest = buildAtlasManifest();
    expect(manifest).toMatchObject({ scope: "/atlas/", start_url: "/atlas/", display: "standalone" });
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true);
    for (const icon of manifest.icons) expect(fs.existsSync(pub(icon.src.replace(/^\//, ""))), icon.src).toBe(true);
    expect(manifest.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("points its launcher shortcuts at spaces that exist, inside the scope", () => {
    const spaceIds = new Set(listAtlasSpaces().map((space) => space.id));
    for (const shortcut of ATLAS_CONFIG.shortcuts) expect(spaceIds.has(shortcut.spaceId)).toBe(true);
    for (const shortcut of buildAtlasManifest().shortcuts) expect(shortcut.url.startsWith("/atlas/")).toBe(true);
  });

  it("has a service worker that never touches data requests", () => {
    const source = fs.readFileSync(pub("atlas-sw.js"), "utf8");
    expect(source).toContain('request.method !== "GET"');
    expect(source).toContain("url.origin !== self.location.origin");
    expect(source).not.toMatch(/\/rest\/|supabase/);
  });
});

describe("atlas frame", () => {
  it("shows the host header in a browser tab and drops it when installed", async () => {
    const source = (await import("node:fs")).readFileSync(path.resolve(process.cwd(), "src/features/atlas/AtlasApp.tsx"), "utf8");
    expect(source).toContain("standalone ? Passthrough : (getAtlasHost().Frame ?? Passthrough)");
    const hook = (await import("node:fs")).readFileSync(path.resolve(process.cwd(), "src/features/atlas/hooks/useStandaloneDisplay.ts"), "utf8");
    expect(hook).toContain("(display-mode: standalone)");
  });
});
