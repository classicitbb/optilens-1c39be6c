import { describe, expect, it } from "vitest";
import { dispatchDocStudioTool } from "../../../supabase/functions/_shared/copilot/docStudioTools";

const ACTOR = "00000000-0000-4000-8000-0000000000ab";

const COMPANY_SETTINGS = {
  physical_line1: "Unit 4, Worthing Main Road",
  physical_city: "Christ Church",
  physical_country: "Barbados",
  tax_tin: "VAT-12345",
  company_reg_no: "REG-999",
  bank_name: "Bank of Nova Scotia",
  bank_account_name: "Classic Visions",
  bank_account_no: "000123456",
  bank_swift: "NOSCBBBB",
  base_currency: "BBD",
  default_vat: 17.5,
  default_paper_size: "letter",
  default_due_days: 30,
};

const QUOTE = {
  id: "22222222-2222-4222-8222-222222222222",
  quote_number: "QTE-0010",
  customer_name: "Bayview Opticians",
  contact_name: "Bayview Opticians",
  currency: "BBD",
  notes_customer: "",
  account_id: 41,
};

const QUOTE_LINES = [
  { id: "l1", sku: "SV-156-HC", item_name: "SV 1.56 Hard Coat", qty: 2, unit_sell_price_bbd: 45.5, sort_order: 1 },
  { id: "l2", sku: "FRM-01", description_override: "Frame, tortoise, 52-18", qty: 1, unit_sell_price_bbd: 120, sort_order: 2 },
];

const CUSTOMER = {
  id: 41,
  name: "Bayview Opticians",
  account_number: "BV0041",
  address: "12 Broad Street, Bridgetown",
  email: "accounts@bayview.example",
};

type Options = { existingConversion?: Record<string, unknown> | null };

/**
 * Minimal stand-in for the Supabase client: enough query-builder surface for
 * the tool's real call sequence, so the test exercises the actual resolution
 * path rather than a mock of it.
 */
const makeDb = (options: Options = {}) => {
  const inserted: Record<string, unknown>[] = [];
  let numberCalls = 0;

  const result = (data: unknown) => {
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "or", "eq", "is", "in", "order", "limit", "not", "neq"]) {
      builder[method] = () => builder;
    }
    builder.maybeSingle = async () => ({ data, error: null });
    builder.single = async () => ({ data, error: null });
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) => resolve({ data, error: null });
    return builder;
  };

  const db = {
    from: (table: string) => {
      if (table === "company_settings") return result(COMPANY_SETTINGS);
      if (table === "customers") return result([CUSTOMER]);
      if (table === "quotes") return result(QUOTE);
      if (table === "quote_lines") return result(QUOTE_LINES);
      if (table === "docstudio_billing_documents") {
        const builder = result(options.existingConversion ?? null) as Record<string, unknown>;
        builder.insert = (values: Record<string, unknown>) => {
          inserted.push(values);
          return { select: async () => ({ data: [{ ...values, id: "33333333-3333-4333-8333-333333333333" }], error: null }) };
        };
        return builder;
      }
      return result(null);
    },
    rpc: async (name: string) => {
      if (name === "next_billing_number") {
        numberCalls += 1;
        return { data: `PRF-000${numberCalls}`, error: null };
      }
      return { data: null, error: null };
    },
  };

  return { db, inserted, numberCalls: () => numberCalls };
};

describe("docstudio_create_document", () => {
  it("converts a quote into a complete pro forma without asking for anything", async () => {
    const { db, inserted } = makeDb();

    const result = await dispatchDocStudioTool(db, "docstudio_create_document", {
      documentType: "proforma",
      sourceRef: "QTE-0010",
    }, ACTOR) as Record<string, any>;

    // Nothing left for a human to type in.
    expect(result.unresolved).toEqual([]);

    const row = inserted[0] as Record<string, any>;
    const content = row.content;

    // Customer resolved from the ERP, not transcribed.
    expect(content.blToName).toBe("Bayview Opticians");
    expect(content.blToAddr).toBe("12 Broad Street, Bridgetown");
    expect(row.customer_account).toBe("BV0041");

    // Letterhead and bank block filled from company settings.
    expect(content.bAddress).toContain("Worthing Main Road");
    expect(content.bVatReg).toBe("VAT-12345");
    expect(content.bkAccNo).toBe("000123456");

    // Lines carried across from the quote.
    expect(content.blRows).toHaveLength(2);
    expect(content.blRows[0]).toMatchObject({ code: "SV-156-HC", qty: "2", unit: "45.5" });

    // Totals computed server-side: subtotal 211, VAT 17.5% => 36.925.
    expect(row.totals.subtotal).toBeCloseTo(211, 10);
    expect(row.totals.vat).toBeCloseTo(36.925, 10);
    expect(row.totals.total).toBeCloseTo(247.925, 10);

    // Provenance and draft status.
    expect(row.source_document_type).toBe("quote");
    expect(row.source_document_id).toBe(QUOTE.id);
    expect(row.status).toBe("draft");
    expect(row.created_by_copilot).toBe(true);
    expect(result.deepLink).toBe("/admin/docs/studio?billingDocument=33333333-3333-4333-8333-333333333333");
  });

  it("takes its number from the sequence rather than inventing one", async () => {
    const { db, inserted, numberCalls } = makeDb();

    await dispatchDocStudioTool(db, "docstudio_create_document", {
      documentType: "proforma",
      sourceRef: "QTE-0010",
    }, ACTOR);

    expect(numberCalls()).toBe(1);
    expect((inserted[0] as Record<string, any>).billing_number).toBe("PRF-0001");
  });

  it("returns the existing draft instead of duplicating a conversion", async () => {
    const { db, inserted, numberCalls } = makeDb({
      existingConversion: {
        id: "44444444-4444-4444-8444-444444444444",
        billing_number: "PRF-0007",
        document_name: "PRF-0007 - Bayview Opticians",
        totals: { total: 247.925 },
        status: "draft",
      },
    });

    const result = await dispatchDocStudioTool(db, "docstudio_create_document", {
      documentType: "proforma",
      sourceRef: "QTE-0010",
    }, ACTOR) as Record<string, any>;

    expect(result.status).toBe("already_exists");
    expect(result.billingNumber).toBe("PRF-0007");
    expect(inserted).toHaveLength(0);
    expect(numberCalls()).toBe(0); // and it did not burn a number
  });

  it("refuses a source it cannot find rather than inventing the document", async () => {
    const { db } = makeDb();
    // quotes/documents both resolve to null for an unknown reference
    const emptyDb = { ...db, from: (table: string) => table === "company_settings" ? db.from(table) : ({
      select: () => ({ or: () => ({ is: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }), limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    }) };

    await expect(dispatchDocStudioTool(emptyDb as never, "docstudio_create_document", {
      documentType: "proforma",
      sourceRef: "QTE-9999",
    }, ACTOR)).rejects.toThrow(/Could not find/i);
  });

  it("rejects an unknown document type", async () => {
    const { db } = makeDb();
    await expect(dispatchDocStudioTool(db, "docstudio_create_document", {
      documentType: "credit_note",
    }, ACTOR)).rejects.toThrow(/Unknown document type/i);
  });
});

describe("docstudio_send_document", () => {
  it("blocks a send when the document has never been rendered", async () => {
    const db = {
      from: () => ({
        select: () => ({
          or: () => ({ is: () => ({ limit: () => ({ maybeSingle: async () => ({
            data: { id: "55555555-5555-4555-8555-555555555555", billing_number: "PRF-0001", document_name: "PRF-0001", document_type: "proforma", rendered_html: "" },
            error: null,
          }) }) }) }),
        }),
      }),
    };

    const result = await dispatchDocStudioTool(db as never, "docstudio_send_document", {
      documentId: "PRF-0001",
      to: ["accounts@bayview.example"],
    }, ACTOR) as Record<string, any>;

    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("not_rendered");
    expect(result.deepLink).toContain("billingDocument=");
  });
});
