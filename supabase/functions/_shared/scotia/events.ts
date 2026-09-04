// ============================================================
// Scotia eCom+ — payment activity event log
// ------------------------------------------------------------
// Stores only reconciliation-safe scalar event fields in
// public.scotia_gateway_events (staff-readable, service-role writable).
// Gateway request/response parameter bags are deliberately never retained.
// ============================================================

export type ScotiaEventKind = "prepare" | "return" | "notify" | "probe";
export type ScotiaEventOutcome = "ok" | "hash_invalid" | "declined" | "error";

export interface ScotiaEventRow {
  kind: ScotiaEventKind;
  outcome: ScotiaEventOutcome;
  oid?: string | null;
  storeId?: string | null;
  env?: string | null;
  approved?: boolean | null;
  failRc?: string | null;
  failReason?: string | null;
  approvalCode?: string | null;
  associationResponseCode?: string | null;
  terminalId?: string | null;
  endpointUrl?: string | null;
  httpStatus?: number | null;
  amount?: number | null;
  currency?: string | null;
  notes?: string | null;
}

interface MinimalAdmin {
  from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: unknown }> };
}

/** Best-effort write — diagnostics must never break a payment flow. */
export async function logScotiaEvent(admin: unknown, row: ScotiaEventRow): Promise<void> {
  try {
    const client = admin as MinimalAdmin;
    const { error } = await client.from("scotia_gateway_events").insert({
      kind: row.kind,
      outcome: row.outcome,
      oid: row.oid ?? null,
      store_id: row.storeId ?? null,
      env: row.env ?? null,
      approved: row.approved ?? null,
      fail_rc: row.failRc ?? null,
      fail_reason: row.failReason ?? null,
      approval_code: row.approvalCode ?? null,
      association_response_code: row.associationResponseCode ?? null,
      terminal_id: row.terminalId ?? null,
      endpoint_url: row.endpointUrl ?? null,
      http_status: row.httpStatus ?? null,
      amount: row.amount ?? null,
      currency: row.currency ?? null,
      notes: row.notes ?? null,
    });
    if (error) console.error("scotia events: insert failed", error);
  } catch (err) {
    console.error("scotia events: insert threw", err);
  }
}

export interface ProbeClassification {
  accepted: boolean;
  classification:
    | "hosted_page_rendered"
    | "store_rejected"
    | "hash_rejected"
    | "http_error"
    | "unrecognized";
  detail: string;
  failRc: string | null;
}

/**
 * Decide what the gateway's HTML reply to a signed probe means. Fiserv does
 * not return a machine-readable code here — the hosted page is either
 * rendered or replaced with an error page, so we classify the markup.
 */
export function classifyProbeHtml(status: number, html: string): ProbeClassification {
  const text = stripHtml(html);
  const lower = text.toLowerCase();
  const failRc = /fail_rc[^0-9a-z]{0,4}([0-9a-z\-]+)/i.exec(text)?.[1] ?? null;

  if (status >= 400) {
    return {
      accepted: false,
      classification: "http_error",
      detail: `Gateway returned HTTP ${status}. ${excerpt(text)}`,
      failRc,
    };
  }

  if (
    lower.includes("select payment method")
    || lower.includes("please select")
    || lower.includes("card number")
    || lower.includes("pay with")
  ) {
    return {
      accepted: true,
      classification: "hosted_page_rendered",
      detail: "The gateway rendered the hosted payment page for this store.",
      failRc,
    };
  }

  if (lower.includes("hash") && (lower.includes("invalid") || lower.includes("not match") || lower.includes("validation"))) {
    return {
      accepted: false,
      classification: "hash_rejected",
      detail: `The gateway rejected the request signature. ${excerpt(text)}`,
      failRc,
    };
  }

  if (
    lower.includes("may not be completed successfully")
    || lower.includes("contact the store administrator")
    || lower.includes("unknown application error")
  ) {
    return {
      accepted: false,
      classification: "store_rejected",
      detail: `The gateway refused the transaction before rendering the payment page. ${excerpt(text)}`,
      failRc,
    };
  }

  return {
    accepted: false,
    classification: "unrecognized",
    detail: excerpt(text) || "The gateway returned an empty response body.",
    failRc,
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function probeSnippet(html: string): string {
  return excerpt(stripHtml(html), 600);
}

function excerpt(text: string, max = 300): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
