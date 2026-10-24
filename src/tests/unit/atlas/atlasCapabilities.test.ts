import { describe, expect, it } from "vitest";
import { NO_CAPABILITIES, resolveCapabilities, type AtlasPermissionContext } from "@/features/atlas/capabilities";
import { getAtlasSpace } from "@/features/atlas/spaces";

const ctx = (overrides: Partial<{ view: string[]; edit: string[]; hasAccess: boolean; canEdit: boolean; isAdmin: boolean }> = {}): AtlasPermissionContext => ({
  canViewFeature: (feature) => (overrides.view ?? []).includes(feature),
  canEditFeature: (feature) => (overrides.edit ?? []).includes(feature),
  adminRole: { hasAccess: overrides.hasAccess ?? false, canEdit: overrides.canEdit ?? false, isAdmin: overrides.isAdmin ?? false },
});

const wiki = getAtlasSpace("wiki")!;
const sops = getAtlasSpace("sops")!;
const website = getAtlasSpace("website")!;

describe("atlas capability map (nobody gains a right)", () => {
  it("website: a viewer who could not edit or publish content before still cannot", () => {
    const viewer = resolveCapabilities(website, ctx({ hasAccess: true, canEdit: false, isAdmin: false }));
    expect(viewer).toEqual({ view: true, edit: false, publish: false, remove: false });
  });

  it("website: editing and publishing follow the admin role's edit right; deleting stays admin-only", () => {
    expect(resolveCapabilities(website, ctx({ hasAccess: true, canEdit: true }))).toEqual({ view: true, edit: true, publish: true, remove: false });
    expect(resolveCapabilities(website, ctx({ hasAccess: true, canEdit: true, isAdmin: true })).remove).toBe(true);
  });

  it("website: edit rights without access grant nothing", () => {
    expect(resolveCapabilities(website, ctx({ hasAccess: false, canEdit: true, isAdmin: true }))).toEqual(NO_CAPABILITIES);
  });

  it("wiki and SOPs keep the wiki feature permission", () => {
    expect(resolveCapabilities(wiki, ctx({ view: ["wiki"] }))).toEqual({ view: true, edit: false, publish: false, remove: false });
    expect(resolveCapabilities(wiki, ctx({ view: ["wiki"], edit: ["wiki"] }))).toEqual({ view: true, edit: true, publish: true, remove: false });
    expect(resolveCapabilities(sops, ctx({ view: ["wiki"] })).view).toBe(true);
  });

  it("wiki edit without wiki view grants nothing", () => {
    expect(resolveCapabilities(wiki, ctx({ edit: ["wiki"] }))).toEqual(NO_CAPABILITIES);
  });

  it("wiki rights do not open the website space, and the reverse", () => {
    expect(resolveCapabilities(website, ctx({ view: ["wiki"], edit: ["wiki"] }))).toEqual(NO_CAPABILITIES);
    expect(resolveCapabilities(wiki, ctx({ hasAccess: true, canEdit: true, isAdmin: true }))).toEqual(NO_CAPABILITIES);
  });
});
