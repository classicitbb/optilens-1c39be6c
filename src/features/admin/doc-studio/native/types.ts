export const DOC_STUDIO_FILE_TYPES = [
  "email",
  "letter",
  "signature",
  "social",
  "shiplabel",
  "statement",
  "pricelist",
] as const;

export const BILLING_DOCUMENT_TYPES = [
  "invoice",
  "quote",
  "proforma",
  "receipt",
] as const;

export type DocStudioFileType = (typeof DOC_STUDIO_FILE_TYPES)[number];
export type BillingDocumentType = (typeof BILLING_DOCUMENT_TYPES)[number];
export type StudioTab =
  Exclude<DocStudioFileType, "pricelist"> | "billing" | "files";
export type JsonRecord = Record<string, unknown>;

export interface StudioFileSummary {
  id: string;
  kind: "file" | "billing";
  fileType?: DocStudioFileType;
  documentType?: BillingDocumentType;
  fileName?: string;
  documentName?: string;
  customerName?: string;
  customerCompany?: string;
  customerAccount?: string;
  billingNumber?: string;
  updatedAt?: string;
  latestAutosaveAt?: string;
  createdAt?: string;
  version?: string;
  metadata?: JsonRecord;
  searchText?: string;
}

export interface StudioFileDetail extends StudioFileSummary {
  content: JsonRecord;
  renderedHtml?: string;
  totals?: JsonRecord;
  paperSize?: "letter" | "a4";
}

export interface StudioDraft {
  tab: StudioTab;
  name: string;
  customerName: string;
  customerAccount: string;
  content: JsonRecord;
  id?: string;
  kind?: "file" | "billing";
  version?: string;
  isTemplate?: boolean;
}

export interface CustomerOption {
  id: string | number;
  name: string;
  account_number?: string;
  address?: string;
  email?: string;
}

export interface EmailContact {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  source?: "customer" | "contact";
}

export const tabLabel = (tab: StudioTab) =>
  ({
    files: "My Files",
    email: "Email",
    letter: "Letterhead",
    signature: "Signature",
    social: "Social",
    billing: "Billing",
    shiplabel: "Ship Label",
    statement: "Statement",
  })[tab];

export const documentTypeLabel = (type: string) =>
  ({
    email: "Email",
    letter: "Letterhead",
    signature: "Signature",
    social: "Social post",
    shiplabel: "Ship label",
    statement: "Statement",
    pricelist: "Price list archive",
    invoice: "Invoice",
    quote: "Quotation",
    proforma: "Pro forma",
    receipt: "Receipt",
  })[type] ?? type;

const asText = (value: unknown) => (typeof value === "string" ? value : "");
const asRows = (value: unknown) => (Array.isArray(value) ? value : []);

export function draftFromFile(file: StudioFileDetail): StudioDraft {
  const kind = file.kind;
  const tab: StudioTab =
    kind === "billing"
      ? "billing"
      : file.fileType === "pricelist"
        ? "files"
        : (file.fileType ?? "email");

  return {
    tab,
    id: file.id,
    kind,
    version: file.version,
    name:
      kind === "billing"
        ? (file.documentName ?? "Billing document")
        : (file.fileName ?? "Untitled file"),
    customerName: file.customerName ?? file.customerCompany ?? "",
    customerAccount: file.customerAccount ?? "",
    isTemplate: Boolean(file.metadata?.isTemplate),
    content: { ...file.content },
  };
}

export function defaultDraft(tab: Exclude<StudioTab, "files">): StudioDraft {
  const today = new Intl.DateTimeFormat("en-CA").format(new Date());
  const content: JsonRecord =
    {
      email: {
        emHeading: "",
        emBody: "",
        emailTo: "",
        emailCc: "",
        emailBcc: "",
        emailSubject: "",
        emailReplyTo: "",
      },
      letter: {
        ltDate: today,
        ltRecipient: "",
        ltSubject: "",
        ltSignName: "",
        ltSignTitle: "",
        ltBody: "",
      },
      signature: {
        sgName: "",
        sgTitle: "",
        sgPhone: "",
        sgEmail: "",
        sgWeb: "classicvisions.net",
        sgTagline: "",
      },
      social: {
        smFormat: "instagram",
        smStyle: "navy",
        smHeadline: "",
        smSub: "",
        smBody: "",
        smHandle: "@classicvisions",
      },
      shiplabel: {
        slFromName: "Classic Visions",
        slFromAddr: "Worthing, Christ Church\nBarbados",
        slFromPhone: "+1 246 433-4928",
        slToName: "",
        slToCompany: "",
        slToAddr: "",
        slToPhone: "",
        slCarrier: "",
        slService: "",
        slTracking: "",
        slWeight: "",
        slDims: "",
        slNote: "",
      },
      statement: {
        stCustomer: "",
        stAccount: "",
        stAddr: "",
        stFrom: "",
        stTo: today,
        stCurrency: "BBD",
        stOpenBal: "0.00",
        stRows: [
          {
            id: crypto.randomUUID(),
            date: "",
            desc: "",
            patient: "",
            debit: "",
            credit: "",
          },
        ],
        stNote: "",
      },
      billing: {
        billType: "invoice",
        blNumber: "",
        blDate: today,
        blDue: "",
        blPO: "",
        blToName: "",
        blToCompany: "",
        blToAddr: "",
        blToAttn: "",
        blCurrency: "BBD",
        blVatEnabled: true,
        blVatRate: "17.5",
        blDiscount: "",
        blShipping: "",
        blRows: [
          {
            id: crypto.randomUUID(),
            code: "",
            desc: "",
            qty: "1",
            unit: "",
            taxable: true,
          },
        ],
        blNotes:
          "Thank you for your business. Please make payment by the due date shown above.",
        billPaperSize: "letter",
      },
    }[tab] ?? {};

  return {
    tab,
    name:
      tab === "billing"
        ? "Untitled invoice"
        : `Untitled ${tabLabel(tab).toLowerCase()}`,
    customerName: "",
    customerAccount: "",
    content,
  };
}

export function copyDraftContent(
  draft: StudioDraft,
  updates: JsonRecord,
): StudioDraft {
  return { ...draft, content: { ...draft.content, ...updates } };
}

export function legacyFilePayload(draft: StudioDraft, renderedHtml: string) {
  return {
    fileType: draft.tab,
    fileName: draft.name,
    customerName: draft.customerName,
    customerAccount: draft.customerAccount,
    metadata: {
      typeLabel: tabLabel(draft.tab),
      isTemplate: Boolean(draft.isTemplate),
    },
    content: draft.content,
    renderedHtml,
    version: draft.version ?? "",
  };
}

export function legacyBillingPayload(
  draft: StudioDraft,
  renderedHtml: string,
  totals: JsonRecord,
) {
  const content = draft.content;
  return {
    documentType: asText(content.billType) || "invoice",
    documentName: draft.name,
    billingNumber: asText(content.blNumber),
    customerName: asText(content.blToName) || draft.customerName,
    customerCompany: asText(content.blToCompany),
    customerAccount: draft.customerAccount,
    paperSize: asText(content.billPaperSize) === "a4" ? "a4" : "letter",
    content,
    renderedHtml,
    totals,
    version: draft.version ?? "",
  };
}

export function contentText(content: JsonRecord, key: string) {
  return asText(content[key]);
}

export function contentRows(content: JsonRecord, key: string) {
  return asRows(content[key]) as JsonRecord[];
}
