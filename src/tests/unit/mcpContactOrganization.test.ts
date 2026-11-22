import { describe, expect, it } from "vitest";
import { ToolContext } from "@lovable.dev/mcp-js";
import tool, { summarizeContactOrganization } from "@/lib/mcp/tools/review-crm-organization";

describe("MCP contact organization", () => {
  it("distinguishes bounded coverage, missing categories and account links", () => {
    const summary = summarizeContactOrganization([
      { pipeline: "Sales", stage: "New", is_company: true, is_archived: false, linked_customer_id: 1 },
      { pipeline: "Sales", stage: "New", is_company: false, is_archived: true, linked_customer_id: null },
      { pipeline: null, stage: null, is_company: null, is_archived: null, linked_customer_id: null },
    ], 8);
    expect(summary).toMatchObject({ visible_total: 8, reviewed_count: 3, complete: false,
      companies: 1, people: 1, unspecified_kind: 1, archived: 1,
      linked_to_customer_account: 1, without_customer_account: 2 });
    expect(summary.pipeline_stages).toEqual([
      { pipeline: "Sales", stage: "New", count: 2 }, { pipeline: null, stage: null, count: 1 },
    ]);
  });
  it("does not present unknown totals as complete", () => {
    expect(summarizeContactOrganization([], null).complete).toBe(false);
    expect(summarizeContactOrganization([], 0).complete).toBe(true);
  });
  it("rejects unauthenticated reads before constructing a database client", async () => {
    const result = await tool.handler({ limit: undefined }, new ToolContext(undefined));
    expect(result.isError).toBe(true);
  });
});
