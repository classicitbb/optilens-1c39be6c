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

  // docstudio_billing_documents has two NOT NULL columns with no default that
  // the model cannot supply — owner_user_id and version. Before these were
  // stamped server-side, every copilot-created document failed on a not-null
  // violation, which is why the resource had never successfully written a row.
  describe("Doc Studio documents", () => {
    const ACTOR = "00000000-0000-4000-8000-0000000000ab";

    const captureInsert = () => {
      const captured: { values: Record<string, unknown> | null } = { values: null };
      const db = {
        from: () => ({
          insert: (values: Record<string, unknown>) => {
            captured.values = values;
            return { select: async () => ({ data: [values], error: null }) };
          },
          update: (values: Record<string, unknown>) => {
            captured.values = values;
            return { eq: () => ({ select: async () => ({ data: [values], error: null }) }) };
          },
        }),
      };
      return { db, captured };
    };

    it("stamps the owner, version and draft status the model cannot supply", async () => {
      const { db, captured } = captureInsert();

      await dispatchAdminResourceTool(db, "admin_create_record", {
        resource: "docstudio_billing_documents",
        values: { document_name: "PRF-0001 - Bayview", document_type: "proforma", content: {}, totals: {} },
      }, ACTOR);

      expect(captured.values).toEqual(expect.objectContaining({
        owner_user_id: ACTOR,
        version: expect.stringMatching(/^[0-9A-F]{16}$/),
        created_by_copilot: true,
        status: "draft",
      }));
    });

    it("forces draft status even when the model asks for something else", async () => {
      const { db, captured } = captureInsert();

      await dispatchAdminResourceTool(db, "admin_create_record", {
        resource: "docstudio_billing_documents",
        values: { document_name: "INV-0001", document_type: "invoice", status: "sent" },
      }, ACTOR);

      expect(captured.values?.status).toBe("draft");
    });

    it("refuses to create a document with no acting admin to own it", async () => {
      const { db } = captureInsert();

      await expect(dispatchAdminResourceTool(db, "admin_create_record", {
        resource: "docstudio_billing_documents",
        values: { document_name: "PRF-0002", document_type: "proforma" },
      })).rejects.toThrow(/signed-in admin/i);
    });

    it("moves the version token on update, so an open studio tab cannot overwrite the change", async () => {
      const { db, captured } = captureInsert();

      await dispatchAdminResourceTool(db, "admin_update_record", {
        resource: "docstudio_billing_documents",
        id: "11111111-1111-4111-8111-111111111111",
        values: { document_name: "PRF-0001 - Bayview Opticians" },
      }, ACTOR);

      expect(captured.values).toEqual(expect.objectContaining({
        version: expect.stringMatching(/^[0-9A-F]{16}$/),
        updated_at: expect.any(String),
      }));
    });

    it("rejects columns that are not writable", async () => {
      const { db, captured } = captureInsert();

      const result = await dispatchAdminResourceTool(db, "admin_create_record", {
        resource: "docstudio_billing_documents",
        values: { document_name: "PRF-0003", rendered_html: "<script>oops</script>" },
      }, ACTOR);

      expect(captured.values).not.toHaveProperty("rendered_html");
      expect(result.ignoredFields).toContain("rendered_html");
    });
  });
});
