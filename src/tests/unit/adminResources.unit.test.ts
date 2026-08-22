import { describe, expect, it } from "vitest";
import { dispatchAdminResourceTool } from "../../../supabase/functions/_shared/copilot/adminResources";

describe("Portal Copilot admin resources", () => {
  it("creates a schema-valid Helpdesk ticket from assistant-friendly values", async () => {
    let inserted: Record<string, unknown> | null = null;
    const db = {
      from: (table: string) => {
        expect(table).toBe("helpdesk_tickets");
        return {
          insert: (values: Record<string, unknown>) => {
            inserted = values;
            return {
              select: async () => ({ data: [values], error: null }),
            };
          },
        };
      },
    };

    await dispatchAdminResourceTool(db, "admin_create_record", {
      resource: "helpdesk_tickets",
      values: {
        title: "Copilot ticket creation regression",
        description: "Created through the shared admin resource tool.",
        priority: "medium",
        assigned_to: "00000000-0000-4000-8000-000000000001",
      },
    });

    expect(inserted).toEqual(expect.objectContaining({
      id: expect.any(String),
      ticket_number: expect.stringMatching(/^TCK-[A-Z0-9]+$/),
      title: "Copilot ticket creation regression",
      description: "Created through the shared admin resource tool.",
      priority: 2,
      owner_user_id: "00000000-0000-4000-8000-000000000001",
      source_channel: "ai_assistant",
      opened_at: expect.any(String),
    }));
    expect(inserted).not.toHaveProperty("assigned_to");
  });
});
