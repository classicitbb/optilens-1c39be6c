import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.resolve(process.cwd(), file), "utf8");

describe("Iris financial-data access", () => {
  it("makes the internal financial capability admin-only and denies public execution", () => {
    const migration = read("supabase/migrations/20260830140634_iris_financial_data_capability.sql");

    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.can_access_financial_data");
    expect(migration).toContain("public.has_role(p_user_id, 'admin'::public.app_role)");
    expect(migration).toContain("auth.uid() = p_user_id");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.can_access_financial_data(uuid) FROM PUBLIC, anon");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.can_access_financial_data(uuid) TO authenticated, service_role");
  });

  it("requires the resolved capability before an Iris tool can expose financial resources", () => {
    const resources = read("supabase/functions/_shared/copilot/adminResources.ts");
    const edge = read("supabase/functions/portal-copilot/index.ts");

    expect(resources).toContain("financialData?: boolean");
    expect(resources).toContain('key: "statements"');
    expect(resources).toContain("Financial data is restricted to administrators with the financial-data capability.");
    expect(resources).toContain("canAccessFinancialData: boolean");
    expect(edge).toContain('db.rpc("can_access_financial_data"');
    expect(edge).toContain("{ canAccessFinancialData }");
  });
});
