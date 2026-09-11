import { describe, expect, it } from "vitest";
import { deactivateLensAlias, upsertActiveLensAliases } from "../../../supabase/functions/innovations-sync/lens-aliases";
function mockAliases(result: { data?: unknown; error?: { message?: string } | null } = {}) {
  const calls: Array<{ method: string; row?: Record<string, unknown>; rows?: Record<string, unknown>[]; options?: unknown; alias?: string }> = [];
  return { calls, client: { from: () => ({
    upsert: async (rows: Record<string, unknown>[], options: unknown) => { calls.push({ method: "upsert", rows, options }); return result; },
    update: (row: Record<string, unknown>) => ({ eq: (_column: string, alias: string) => ({ select: async (_columns: string) => { calls.push({ method: "update", row, alias }); return result; } }) }),
  }) } };
}
describe("Innovations lens-alias receiver writes", () => {
  it("keeps a full active alias batch on the normal UPSERT path", async () => {
    const mock = mockAliases(); const rows = [{ alias: "0210002800095", material_code: "021", is_active: true }];
    await upsertActiveLensAliases(mock.client as any, rows);
    expect(mock.calls).toEqual([{ method: "upsert", rows, options: { onConflict: "alias", ignoreDuplicates: false } }]);
  });
  it("updates a minimal inactive tombstone without catalogue fields", async () => {
    const mock = mockAliases({ data: [{ alias: "0210002800095" }] });
    const result = await deactivateLensAlias(mock.client as any, { alias: "0210002800095", is_active: false, synced_at: "2026-09-11T12:00:00.000Z" });
    expect(result).toEqual({ updated: true, missing: false, error: null });
    expect(mock.calls).toEqual([{ method: "update", alias: "0210002800095", row: { is_active: false, synced_at: "2026-09-11T12:00:00.000Z" } }]);
  });
  it("treats an unknown tombstone as a successful no-op", async () => {
    const mock = mockAliases({ data: [] });
    expect(await deactivateLensAlias(mock.client as any, { alias: "missing", is_active: false })).toEqual({ updated: false, missing: true, error: null });
    expect(mock.calls.some((call) => call.method === "upsert")).toBe(false);
  });
  it("returns an actual receiver write failure for normal sync failure handling", async () => {
    const mock = mockAliases({ error: { message: "database unavailable" } });
    const result = await deactivateLensAlias(mock.client as any, { alias: "0210002800095", is_active: false });
    expect(result.error?.message).toBe("database unavailable"); expect(result.updated).toBe(false);
  });
});
