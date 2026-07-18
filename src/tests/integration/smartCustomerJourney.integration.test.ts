import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { APP_ROUTE_REGISTRY } from "@/config/routeRegistry";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

describe("smart customer journey integration contract", () => {
  it("registers every new canonical route with the correct access mode", () => {
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({ id: "public.lens-assistant", path: "/lens-assistant", authMode: "public", status: "active" }));
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({ id: "customer.rx-draft", path: "/profile/rx-drafts/:draftId", authMode: "authenticated", status: "active" }));
    expect(APP_ROUTE_REGISTRY).toContainEqual(expect.objectContaining({ id: "admin.website.store.lens-assistant", path: "/admin/website/store/lens-assistant", authMode: "admin", status: "active" }));
  });

  it("keeps Rx drafts owner-private and customer command-centre identity server-derived", () => {
    const migration = read("supabase/migrations/20260710120000_smart_customer_journey_first_release.sql");
    expect(migration).toContain("auth.uid() = user_id");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.get_customer_command_center()");
    expect(migration).not.toMatch(/get_customer_command_center\s*\([^)]*user/i);
    expect(migration).toContain("v_user_id uuid := auth.uid()");
  });

  it("never falls back to generic prices or unpublished recommendation rules", () => {
    const migration = read("supabase/migrations/20260710120000_smart_customer_journey_first_release.sql");
    expect(migration).toContain("WHERE status = 'published'");
    expect(migration).toContain("pcr.pricelist_version_id = v_pricelist_id");
    expect(migration).toContain("WHEN v_pricelist_id IS NULL OR customer_price IS NULL THEN 'not_assigned'");
    expect(migration).toContain("'Confirm with the lab'");
  });

  it("keeps LabLink as the explicit final submission surface", () => {
    const page = read("src/pages/LabLinkEmbedPage.tsx");
    expect(page).toContain("This draft has not been submitted");
    expect(page).not.toContain('allow="clipboard-read; clipboard-write"');
  });

  it("scopes private assistant answers to a signed-in account and states the job-feed limitation", () => {
    const context = read("src/features/assistant/CompanionAssistantContext.tsx");
    expect(context).toContain("Boolean(user)");
    expect(context).toContain("I cannot search Innovations or LabLink jobs");
    expect(context).toContain("I will not invent or substitute a price");
  });
});
