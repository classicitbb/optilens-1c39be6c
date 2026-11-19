import { beforeEach, describe, expect, it, vi } from "vitest";
import createTask from "@/lib/mcp/tools/create-crm-task";
import listTasks from "@/lib/mcp/tools/list-crm-tasks";
import searchCrm from "@/lib/mcp/tools/search-crm";

const { db, query } = vi.hoisted(() => {
  const query = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "activity-1" }, error: null }),
  };
  return { db: { from: vi.fn(() => query) }, query };
});

vi.mock("@/lib/mcp/supabase", () => ({
  supabaseForUser: () => db,
  notAuthenticated: { isError: true },
  ok: (data: unknown) => data,
  fail: (error: string) => ({ error }),
}));

const ctx = {
  isAuthenticated: () => true,
  getUserId: () => "staff-1",
} as Parameters<typeof createTask.handler>[1];

beforeEach(() => vi.clearAllMocks());

describe("MCP CRM activities", () => {
  it("creates scheduled tasks with a valid activity channel and state", async () => {
    const dueAt = "2026-11-19T09:00:00-04:00";
    await createTask.handler({
      contact_id: "contact-1", content: "Call the account", activity_type: "task",
      title: "Follow up", priority: "high", due_at: dueAt,
    }, ctx);
    expect(db.from).toHaveBeenCalledWith("activities");
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      type: "note", activity_type: "Follow up", status: "planned", priority: "high",
      due_at: dueAt, contact_id: "contact-1", created_by: "staff-1",
    }));
  });

  it("keeps unscheduled notes in the inbox", async () => {
    await createTask.handler({ contact_id: "contact-1", content: "Call notes", activity_type: undefined, title: undefined, due_at: undefined, priority: undefined }, ctx);
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({
      type: "note", status: "inbox", due_at: null, priority: "normal",
    }));
  });

  it("maps the old open and done filters to current activity states", async () => {
    await listTasks.handler({ status: "open", contact_id: undefined, limit: undefined }, ctx);
    await listTasks.handler({ status: "done", contact_id: undefined, limit: undefined }, ctx);
    expect(query.in).toHaveBeenCalledWith("status", ["inbox", "planned", "in_progress", "waiting"]);
    expect(query.eq).toHaveBeenCalledWith("status", "completed");
  });
});

describe("MCP CRM filtered search", () => {
  it("filters by country without returning financial columns", async () => {
    await searchCrm.handler({ query: undefined, country: "Grenada", account_number: undefined, limit: undefined }, ctx);
    expect(query.eq).toHaveBeenCalledWith("country_code", "Grenada");
    expect(query.select).toHaveBeenCalledWith("id,name,account_number,country_code");
    expect(query.select).not.toHaveBeenCalledWith(expect.stringContaining("credit_limit"));
  });

  it("uses the exact account number and finds its linked contact", async () => {
    query.limit.mockResolvedValueOnce({ data: [{ id: 17, contact_id: "contact-1" }], error: null });
    await searchCrm.handler({ query: undefined, country: undefined, account_number: "bb-17", limit: undefined }, ctx);
    expect(query.eq).toHaveBeenCalledWith("account_number", "BB-17");
    expect(query.or).toHaveBeenCalledWith("linked_customer_id.eq.17,id.eq.contact-1");
  });
});
