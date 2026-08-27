import { describe, expect, it } from "vitest";
import {
  buildBillingContent,
  buildFileContent,
  BILL_FILE_KEYS,
  computeBillTotals,
  issuerFromCompanySettings,
  mapLinesToBlRows,
  unresolvedFields,
} from "../../../supabase/functions/_shared/copilot/docStudioContent";

// computeBillTotals is a port of billTotals() in public/ds/studio-logic.js:2155.
// These cases exist to catch drift: if the studio's formula changes and this one
// doesn't, a document's stored totals stop matching what the customer sees.
describe("computeBillTotals", () => {
  it("apportions the discount across taxable rows and puts shipping in the VAT base", () => {
    const totals = computeBillTotals({
      billType: "invoice",
      blVatEnabled: true,
      blVatRate: "17.5",
      blDiscount: "100",
      blShipping: "50",
      blRows: [
        { qty: "2", unit: "300", taxable: true },   // 600, taxable
        { qty: "1", unit: "400", taxable: false },  // 400, exempt
      ],
    });

    // subtotal 1000; taxableSum 600; discTaxable = 100 * (600/1000) = 60
    // vatBase = (600 - 60) + 50 = 590; vat = 590 * 17.5 / 100 = 103.25
    expect(totals.subtotal).toBe(1000);
    expect(totals.discount).toBe(100);
    expect(totals.shipping).toBe(50);
    expect(totals.vat).toBeCloseTo(103.25, 10);
    expect(totals.total).toBeCloseTo(1053.25, 10); // 1000 - 100 + 50 + 103.25
  });

  it("differs from the naive subtotal * rate calculation", () => {
    const content = {
      billType: "invoice",
      blVatEnabled: true,
      blVatRate: "17.5",
      blDiscount: "100",
      blShipping: "50",
      blRows: [
        { qty: "2", unit: "300", taxable: true },
        { qty: "1", unit: "400", taxable: false },
      ],
    };
    const naive = 1000 * 17.5; // the formula the original request specified
    expect(computeBillTotals(content).vat).not.toBeCloseTo(naive, 2);
  });

  it("treats blVatRate as a percentage, not a fraction", () => {
    const totals = computeBillTotals({
      blVatEnabled: true,
      blVatRate: "17.5",
      blRows: [{ qty: "1", unit: "100", taxable: true }],
    });
    expect(totals.vat).toBeCloseTo(17.5, 10);
  });

  it("charges no VAT when VAT is disabled", () => {
    const totals = computeBillTotals({
      blVatEnabled: false,
      blVatRate: "17.5",
      blRows: [{ qty: "1", unit: "100", taxable: true }],
    });
    expect(totals.vat).toBe(0);
    expect(totals.total).toBe(100);
  });

  it("never lets a discount larger than the taxable base produce negative VAT", () => {
    const totals = computeBillTotals({
      blVatEnabled: true,
      blVatRate: "17.5",
      blDiscount: "5000",
      blRows: [{ qty: "1", unit: "100", taxable: true }],
    });
    expect(totals.vat).toBe(0);
  });

  it("defaults a receipt's amount paid to the full total, and other types to zero", () => {
    const rows = [{ qty: "1", unit: "200", taxable: true }];
    const receipt = computeBillTotals({ billType: "receipt", blVatEnabled: false, blRows: rows });
    const invoice = computeBillTotals({ billType: "invoice", blVatEnabled: false, blRows: rows });
    expect(receipt.amountPaid).toBe(200);
    expect(receipt.balance).toBe(0);
    expect(invoice.amountPaid).toBe(0);
    expect(invoice.balance).toBe(200);
  });
});

describe("buildBillingContent", () => {
  const settings = {
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

  it("fills the letterhead and bank block from company settings, so no human retypes them", () => {
    const issuer = issuerFromCompanySettings(settings);
    const content = buildBillingContent(
      { documentType: "proforma", billingNumber: "PRF-0001", customer: { name: "Bayview Opticians" } },
      issuer,
      "2026-08-27",
    );

    expect(content.bAddress).toBe("Unit 4, Worthing Main Road, Christ Church, Barbados");
    expect(content.bVatReg).toBe("VAT-12345");
    expect(content.bRegNo).toBe("REG-999");
    expect(content.bkBankName).toBe("Bank of Nova Scotia");
    expect(content.bkAccNo).toBe("000123456");
    expect(content.bkSwift).toBe("NOSCBBBB");
    expect(content.blCurrency).toBe("BBD");
    expect(content.blVatRate).toBe("17.5");
  });

  it("emits every key the studio expects, so nothing renders as undefined", () => {
    const content = buildBillingContent(
      { documentType: "invoice", billingNumber: "INV-0001" },
      issuerFromCompanySettings(settings),
      "2026-08-27",
    );
    for (const key of BILL_FILE_KEYS) {
      expect(content, `missing content key ${key}`).toHaveProperty(key);
    }
  });

  it("derives the due date from the configured terms", () => {
    const content = buildBillingContent(
      { documentType: "invoice", billingNumber: "INV-0002" },
      issuerFromCompanySettings(settings),
      "2026-08-27",
    );
    expect(content.blDate).toBe("2026-08-27");
    expect(content.blDue).toBe("2026-09-26");
  });

  it("carries the pro forma disclaimer by default", () => {
    const content = buildBillingContent(
      { documentType: "proforma", billingNumber: "PRF-0002" },
      issuerFromCompanySettings(settings),
      "2026-08-27",
    );
    expect(content.blNotes).toContain("not a tax invoice");
  });
});

describe("mapLinesToBlRows", () => {
  it("maps ERP quote lines onto the studio's row shape", () => {
    const rows = mapLinesToBlRows([
      { sku: "SV-156-HC", item_name: "SV 1.56 Hard Coat", qty: 2, unit_sell_price_bbd: 45.5 },
      { sku: "FRM-01", description_override: "Frame, tortoise, 52-18", qty: 1, unit_sell_price_bbd: 120 },
    ]);
    expect(rows).toEqual([
      { id: expect.any(String), code: "SV-156-HC", desc: "SV 1.56 Hard Coat", qty: "2", unit: "45.5", taxable: true },
      { id: expect.any(String), code: "FRM-01", desc: "Frame, tortoise, 52-18", qty: "1", unit: "120", taxable: true },
    ]);
  });

  it("always returns at least one row, because an empty grid breaks the editor", () => {
    expect(mapLinesToBlRows([])).toHaveLength(1);
    expect(mapLinesToBlRows(undefined)).toHaveLength(1);
  });
});

describe("unresolvedFields", () => {
  it("reports what could not be resolved without blocking the draft", () => {
    const missing = unresolvedFields({
      blToName: "",
      blToCompany: "",
      blNumber: "PRF-0003",
      blVatEnabled: true,
      blVatRate: "17.5",
      bkBankName: "Bank of Nova Scotia",
      blRows: [{ code: "SV-156", desc: "SV 1.56", qty: "1", unit: "" }],
    });
    expect(missing).toContain("customer name");
    expect(missing.some((entry) => entry.startsWith("unit price for line 1"))).toBe(true);
  });

  it("is silent on a complete document", () => {
    const content = buildBillingContent(
      {
        documentType: "proforma",
        billingNumber: "PRF-0004",
        customer: { name: "Bayview Opticians" },
        lines: [{ sku: "SV-156", item_name: "SV 1.56", qty: 1, unit_sell_price_bbd: 45 }],
      },
      issuerFromCompanySettings({ bank_name: "Bank of Nova Scotia", default_vat: 17.5 }),
      "2026-08-27",
    );
    expect(unresolvedFields(content)).toEqual([]);
  });
});

describe("buildFileContent", () => {
  it("defaults every key for the supported file types", () => {
    expect(buildFileContent("email", { emHeading: "Price update" })).toEqual(
      expect.objectContaining({ emHeading: "Price update", emBody: "", emCta: "" }),
    );
    expect(buildFileContent("letter", {}).docType).toBe("letter");
  });

  it("refuses a file type it has no key map for", () => {
    expect(() => buildFileContent("pricelist", {})).toThrow(/not supported/i);
  });
});
