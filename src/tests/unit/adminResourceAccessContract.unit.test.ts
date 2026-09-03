import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { dispatchAdminResourceTool } from "../../../supabase/functions/_shared/copilot/adminResources";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

/**
 * Regression harness for the 500 caused by the `access` parameter being dropped
 * from `dispatchAdminResourceTool` while callers still passed it. These tests
 * fail loudly if that signature (or any caller) regresses.
 */
describe("admin resource dispatcher access contract", () => {
  it("declares the access parameter with a fail-closed default", () => {
    const source = read("supabase/functions/_shared/copilot/adminResources.ts");
    expect(source).toContain("access: AdminResourceAccess = { canAccessFinancialData: false }");
    // The dispatcher takes (db, name, input, actorUserId?, access).
    expect(dispatchAdminResourceTool.length).toBeGreaterThanOrEqual(3);
  });

  it("denies a financial resource when no capability is supplied", async () => {
    const db = { from: () => { throw new Error("must not query"); } };
    await expect(
      dispatchAdminResourceTool(db as never, "admin_search_records", { resource: "statements" }),
    ).rejects.toThrow(/Financial data is restricted/);
  });

  it("denies a financial resource when the capability is explicitly false", async () => {
    const db = { from: () => { throw new Error("must not query"); } };
    await expect(
      dispatchAdminResourceTool(db as never, "admin_get_record", { resource: "statements", id: 1 }, undefined, {
        canAccessFinancialData: false,
      }),
    ).rejects.toThrow(/Financial data is restricted/);
  });

  it("still lists resources without any access object", async () => {
    const result = await dispatchAdminResourceTool({} as never, "admin_list_resources", {});
    expect(result.status).toBe("ok");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("keeps every caller passing an explicit access object", () => {
    expect(read("supabase/functions/portal-copilot/index.ts")).toContain("{ canAccessFinancialData }");
    const docStudio = read("supabase/functions/_shared/copilot/docStudioTools.ts");
    expect(docStudio.match(/canAccessFinancialData: false/g)?.length).toBe(2);
    for (const tool of ["admin-get-record", "admin-search-records", "admin-write-record"]) {
      expect(read(`src/lib/mcp/tools/${tool}.ts`)).toContain("callerCanAccessFinancialData(ctx)");
    }
  });
});
