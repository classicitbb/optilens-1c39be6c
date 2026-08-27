// Doc Studio content builder.
//
// Doc Studio stores a whole billing document in one `content` JSON column whose
// exact key set is defined by the studio front-end, and computes `totals` in the
// browser. Anything writing that column server-side has to produce the same
// shape, or the studio silently drops fields on the next save.
//
// So this module owns two things:
//   - the key sets, ported from public/ds/studio-logic.js (BILL_FILE_KEYS :1556,
//     FILE_KEYS :1676)
//   - computeBillTotals, a direct port of billTotals() (:2155)
//
// The copilot passes loose, human-shaped input; this turns it into the exact
// shape. The model never assembles blXxx keys and never does the arithmetic —
// that is the point, since a VAT figure invented by a language model can reach
// a customer.
//
// Deno-safe: no imports, no env reads, no I/O at module scope (same rule as
// adminResources.ts, which is bundled into both edge functions).

// deno-lint-ignore no-explicit-any
type Loose = Record<string, any>;

/** Exact content key set for a billing document — studio-logic.js:1556. */
export const BILL_FILE_KEYS = [
  "billType", "blNumber", "blDate", "blDue", "blPO",
  "blToName", "blToCompany", "blToAddr", "blToAttn",
  "blCurrency", "blVatEnabled", "blVatRate", "blDiscount", "blShipping", "blRows",
  "blPaidMethod", "blPaidRef", "blAmountPaid", "blNotes", "billPaperSize",
  "bAddress", "bRegNo", "bVatReg",
  "bkBankName", "bkAccName", "bkAccNo", "bkBranch", "bkSwift", "bkNote",
  "selectedBillingCustomer",
] as const;

/** Content key sets for the file types in scope — studio-logic.js:1676. */
export const FILE_KEYS: Record<string, readonly string[]> = {
  email: ["emHeader", "emFooter", "emEyebrow", "emPreheader", "emHeading", "emCta", "emCtaUrl", "emHeroUrl", "emTagline", "emDisclaimer", "emBody"],
  letter: ["docType", "ltDate", "ltRecipient", "ltSubject", "ltSignName", "ltSignTitle", "ltEyebrow", "ltAmount", "ltTo", "ltFrom", "ltRe", "ltBody"],
};

/** Per-type metadata — studio-logic.js:1519. */
export const BILL_META: Record<string, { title: string; prefix: string; note: string }> = {
  invoice: { title: "INVOICE", prefix: "INV", note: "" },
  quote: { title: "QUOTATION", prefix: "QTE", note: "This quotation is valid until the date shown above and is subject to our standard terms of sale. Prices are subject to change thereafter." },
  proforma: { title: "PRO FORMA INVOICE", prefix: "PRF", note: "This is a pro forma invoice for customs and quotation purposes only. It is not a tax invoice and not a demand for payment. Goods remain the property of the supplier until paid in full." },
  receipt: { title: "RECEIPT", prefix: "RCT", note: "" },
};

export const DOCUMENT_TYPES = ["invoice", "quote", "proforma", "receipt"] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export const isDocumentType = (value: unknown): value is DocumentType =>
  typeof value === "string" && (DOCUMENT_TYPES as readonly string[]).includes(value);

export type BillRow = { id: string; code: string; desc: string; qty: string; unit: string; taxable: boolean };
export type BillTotals = {
  subtotal: number; discount: number; shipping: number;
  vat: number; rate: number; total: number; amountPaid: number; balance: number;
};

const num = (value: unknown) => {
  const parsed = parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const str = (value: unknown, max = 500) => String(value ?? "").trim().slice(0, max);

/**
 * Direct port of studio-logic.js billTotals() (:2155). Any change here must be
 * mirrored there, or a document's stored totals will disagree with what the
 * studio renders on screen.
 *
 * The parts that are easy to get wrong, and that a naive `subtotal * rate`
 * gets wrong: only rows with taxable !== false contribute to the VAT base, the
 * discount is apportioned across the taxable share, shipping sits inside the
 * VAT base, and blVatRate is a percentage.
 */
export const computeBillTotals = (content: Loose): BillTotals => {
  const rows: Loose[] = Array.isArray(content.blRows) ? content.blRows : [];
  let subtotal = 0;
  let taxableSum = 0;
  for (const row of rows) {
    const amount = num(row.qty) * num(row.unit);
    subtotal += amount;
    if (row.taxable !== false) taxableSum += amount;
  }
  const discount = num(content.blDiscount);
  const shipping = num(content.blShipping);
  const discTaxable = subtotal > 0 ? discount * (taxableSum / subtotal) : 0;
  const rate = num(content.blVatRate);
  const vatBase = Math.max(0, (taxableSum - discTaxable) + shipping);
  const vat = content.blVatEnabled ? vatBase * rate / 100 : 0;
  const total = subtotal - discount + shipping + vat;
  const paidRaw = parseFloat(String(content.blAmountPaid ?? ""));
  const amountPaid = Number.isNaN(paidRaw) ? (content.billType === "receipt" ? total : 0) : paidRaw;
  return { subtotal, discount, shipping, vat, rate, total, amountPaid, balance: total - amountPaid };
};

/**
 * Issuer defaults, read from company_settings rather than the studio's
 * localStorage. Without this every copilot-created document arrives with a
 * blank letterhead and a blank payment block.
 */
export type IssuerDefaults = {
  address: string; regNo: string; vatReg: string;
  bankName: string; bankAccName: string; bankAccNo: string;
  bankBranch: string; bankSwift: string; bankNote: string;
  currency: string; vatRate: string; vatEnabled: boolean;
  paperSize: string; dueDays: number;
};

/** Composes the letterhead address from the split physical_* address columns. */
export const issuerFromCompanySettings = (settings: Loose | null): IssuerDefaults => {
  const row = settings ?? {};
  const address = [row.physical_line1, row.physical_line2, row.physical_city, row.physical_state, row.physical_postcode, row.physical_country]
    .map((part) => str(part, 120))
    .filter(Boolean)
    .join(", ");
  const vatRate = row.default_vat === null || row.default_vat === undefined ? "" : String(row.default_vat);
  return {
    address: address || "Worthing, Christ Church, Barbados",
    regNo: str(row.company_reg_no, 60),
    vatReg: str(row.tax_tin, 60),
    bankName: str(row.bank_name, 120),
    bankAccName: str(row.bank_account_name, 120),
    bankAccNo: str(row.bank_account_no, 60),
    bankBranch: str(row.bank_branch, 120),
    bankSwift: str(row.bank_swift, 40),
    bankNote: str(row.bank_note, 300),
    currency: str(row.base_currency, 8) || "BBD",
    vatRate: vatRate || "17.5",
    vatEnabled: num(vatRate || "17.5") > 0,
    paperSize: row.default_paper_size === "a4" ? "a4" : "letter",
    dueDays: Number.isFinite(Number(row.default_due_days)) ? Number(row.default_due_days) : 30,
  };
};

const addDays = (isoDate: string, days: number) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * Maps lines from any supported source into the studio's row shape: quote_lines
 * / order_items (ERP column names), another document's blRows, or the loose
 * {code, description, qty, price} an admin might paste.
 */
export const mapLinesToBlRows = (lines: unknown): BillRow[] => {
  const list: Loose[] = Array.isArray(lines) ? lines : [];
  const rows = list.map((line, index) => ({
    id: String(line.id ?? index + 1),
    code: str(line.code ?? line.sku ?? line.item_code ?? "", 60),
    desc: str(line.desc ?? line.description_override ?? line.description ?? line.item_name ?? line.name ?? "", 300),
    qty: String(line.qty ?? line.quantity ?? 1),
    unit: String(
      line.unit ?? line.unit_price ?? line.price ??
        line.unit_sell_price_bbd ?? line.unit_price_bbd ?? "",
    ),
    taxable: line.taxable !== false,
  }));
  // The studio always keeps at least one row; an empty grid breaks its editor.
  return rows.length ? rows : [{ id: "1", code: "", desc: "", qty: "1", unit: "", taxable: true }];
};

export type BillingInput = {
  documentType: DocumentType;
  billingNumber: string;
  date?: string;
  dueDate?: string;
  poRef?: string;
  customer?: { name?: string; company?: string; address?: string; attention?: string; account?: string };
  lines?: unknown;
  currency?: string;
  vatEnabled?: boolean;
  vatRate?: string | number;
  discount?: string | number;
  shipping?: string | number;
  paidMethod?: string;
  paidRef?: string;
  amountPaid?: string | number;
  notes?: string;
  paperSize?: string;
};

/**
 * Builds the full content object. Every key in BILL_FILE_KEYS is present —
 * defaulted, never omitted — because the studio reads them straight into
 * component state, where a missing key renders as the string "undefined".
 */
export const buildBillingContent = (input: BillingInput, issuer: IssuerDefaults, today: string): Loose => {
  const meta = BILL_META[input.documentType] ?? BILL_META.invoice;
  const date = str(input.date, 40) || today;
  const customer = input.customer ?? {};
  return {
    billType: input.documentType,
    blNumber: str(input.billingNumber, 80),
    blDate: date,
    blDue: str(input.dueDate, 40) || addDays(date, issuer.dueDays),
    blPO: str(input.poRef, 80),
    blToName: str(customer.name, 220),
    blToCompany: str(customer.company, 220),
    blToAddr: str(customer.address, 500),
    blToAttn: str(customer.attention, 120),
    blCurrency: str(input.currency, 8) || issuer.currency,
    blVatEnabled: input.vatEnabled ?? issuer.vatEnabled,
    blVatRate: String(input.vatRate ?? issuer.vatRate),
    blDiscount: input.discount === undefined ? "" : String(input.discount),
    blShipping: input.shipping === undefined ? "" : String(input.shipping),
    blRows: mapLinesToBlRows(input.lines),
    blPaidMethod: str(input.paidMethod, 80) || "Bank transfer",
    blPaidRef: str(input.paidRef, 80),
    blAmountPaid: input.amountPaid === undefined ? "" : String(input.amountPaid),
    blNotes: str(input.notes, 2000) || meta.note ||
      "Thank you for your business. Please make payment by the due date shown above.",
    billPaperSize: input.paperSize === "a4" || input.paperSize === "letter" ? input.paperSize : issuer.paperSize,
    bAddress: issuer.address,
    bRegNo: issuer.regNo,
    bVatReg: issuer.vatReg,
    bkBankName: issuer.bankName,
    bkAccName: issuer.bankAccName,
    bkAccNo: issuer.bankAccNo,
    bkBranch: issuer.bankBranch,
    bkSwift: issuer.bankSwift,
    bkNote: issuer.bankNote,
    selectedBillingCustomer: str(customer.account, 120),
  };
};

/** Builds an email or letter file's content, same defaulting rule. */
export const buildFileContent = (fileType: string, loose: Loose): Loose => {
  const keys = FILE_KEYS[fileType];
  if (!keys) throw new Error(`Doc Studio file type not supported by the copilot: ${fileType}`);
  const content: Loose = {};
  for (const key of keys) content[key] = loose[key] ?? "";
  if (fileType === "letter" && !content.docType) content.docType = "letter";
  return content;
};

/**
 * Advisory only — reports what could not be resolved from any source so the
 * copilot can say so in one line. It deliberately does not block the write: a
 * half-complete draft you can see and correct beats a refusal you have to argue
 * with.
 */
export const unresolvedFields = (content: Loose): string[] => {
  const missing: string[] = [];
  if (!content.blToName && !content.blToCompany) missing.push("customer name");
  if (!content.blNumber) missing.push("document number");
  const rows: Loose[] = Array.isArray(content.blRows) ? content.blRows : [];
  const realRows = rows.filter((row) => row.desc || row.code);
  if (!realRows.length) missing.push("line items");
  realRows.forEach((row, index) => {
    if (!String(row.unit ?? "").trim()) missing.push(`unit price for line ${index + 1} (${row.desc || row.code})`);
  });
  if (content.blVatEnabled && !num(content.blVatRate)) missing.push("VAT rate");
  if (!content.bkBankName && !content.bkAccNo) missing.push("bank details (set them in Settings → Company)");
  return missing;
};

/** Document name the studio would derive itself — studio-logic.js:2003. */
export const billingDocumentName = (content: Loose) => {
  const meta = BILL_META[content.billType] ?? BILL_META.invoice;
  const who = content.blToCompany || content.blToName;
  return `${content.blNumber || meta.title}${who ? ` - ${who}` : ""}`.slice(0, 220);
};
