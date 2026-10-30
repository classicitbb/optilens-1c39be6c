import { describe, expect, it } from "vitest";
import { HELP_CONTEXT_PAGES, helpCoverageGaps } from "@/help/coverage";
import { portalPathToContextSlug } from "@/help/portalContexts";
import { isHowTo, isVisibleInHelpPanel } from "@/help/helpArticleKinds";

describe("help coverage", () => {
  it("lists every admin context and every portal page", () => {
    const values = HELP_CONTEXT_PAGES.map((p) => p.value);
    expect(values).toContain("finance/people");
    expect(values).toContain("finance/payroll");
    expect(values).toContain("settings/training");
    expect(values).toContain("portal/home");
    expect(values).toContain("portal/orders");
    expect(values).not.toContain("all");
    expect(new Set(values).size).toBe(values.length);
  });

  it("reports pages with no published article", () => {
    const covered = HELP_CONTEXT_PAGES.map((p) => p.value).filter((v) => v !== "finance/payroll" && v !== "portal/statements");
    expect(helpCoverageGaps(covered).map((p) => p.value)).toEqual(["finance/payroll", "portal/statements"]);
  });
});

describe("portal help contexts", () => {
  it("maps portal paths to context slugs", () => {
    expect(portalPathToContextSlug("/profile")).toBe("portal/home");
    expect(portalPathToContextSlug("/profile/")).toBe("portal/home");
    expect(portalPathToContextSlug("/profile/orders")).toBe("portal/orders");
    expect(portalPathToContextSlug("/profile/helpdesk/42")).toBe("portal/helpdesk");
  });
});

describe("help article kinds", () => {
  it("treats content_type howto as a how-to", () => {
    expect(isHowTo({ content_type: "howto" })).toBe(true);
    expect(isHowTo({ content_type: "wiki" })).toBe(false);
    expect(isHowTo({})).toBe(false);
  });

  it("shows drafts to editors only and never archived articles", () => {
    expect(isVisibleInHelpPanel("published", false)).toBe(true);
    expect(isVisibleInHelpPanel(undefined, false)).toBe(true);
    expect(isVisibleInHelpPanel("draft", false)).toBe(false);
    expect(isVisibleInHelpPanel("draft", true)).toBe(true);
    expect(isVisibleInHelpPanel("archived", true)).toBe(false);
  });
});
