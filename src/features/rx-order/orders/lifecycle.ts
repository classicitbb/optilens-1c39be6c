// What a customer sees of an Rx order's life, from the safe facts the
// get_my_rx_order_status / list_my_rx_orders functions return. Pure, so the
// list chip, the detail timeline and the tests all agree.
//
//   Draft → Submitted → In review → Sent to lab → In production → Shipped
//
// Nothing here reads lab internals: a failed hand-off to the lab simply stays "In review".

export interface RxOrderFacts {
  quote_id: string;
  rx_order_number: number | null;
  quote_status: string;
  created_at: string;
  updated_at?: string | null;
  currency?: string | null;
  total: number | null;
  order_id: string | null;
  order_status: string | null;
  order_checkout_method?: string | null;
  submission_status: string | null;
  submitted_at: string | null;
  released_at: string | null;
  sent_at: string | null;
  lab_status: string | null;
  lab_status_at: string | null;
  order_item_count?: number | null;
  paid?: boolean | null;
  payload?: any;
  lines?: { line_type: string; item_name: string; qty: number; unit_price: number }[];
  events?: { event: string; at: string }[];
}

export type RxStage = "draft" | "submitted" | "in_review" | "sent_to_lab" | "in_production" | "shipped" | "cancelled";

export const STAGE_LABELS: Record<RxStage, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  sent_to_lab: "Sent to lab",
  in_production: "In production",
  shipped: "Shipped",
  cancelled: "Cancelled",
};

const SHIPPED = /ship|deliver|dispatch|despatch|complete|invoic|collected/i;

export function rxStage(f: Pick<RxOrderFacts, "quote_status" | "submission_status" | "submitted_at" | "sent_at" | "lab_status" | "order_id">): RxStage {
  if (f.quote_status === "Void" || f.quote_status === "Rejected" || f.quote_status === "Expired" || f.submission_status === "cancelled") return "cancelled";
  if (f.lab_status) return SHIPPED.test(f.lab_status) ? "shipped" : "in_production";
  if (f.submission_status === "submitted") return "sent_to_lab";
  if (f.submission_status === "approved" || f.submission_status === "claimed") return "in_review";
  if (f.submission_status === "failed") return "in_review";
  if (f.submission_status === "pending_review") return "submitted";
  return f.order_id ? "submitted" : "draft";
}

export interface TimelineStep { stage: RxStage; label: string; at: string | null; state: "done" | "current" | "todo" }

const FLOW: RxStage[] = ["submitted", "in_review", "sent_to_lab", "in_production", "shipped"];

/** The five steps after Draft, each done / current / todo, with the time it happened when known. */
export function rxTimeline(f: RxOrderFacts): TimelineStep[] {
  const stage = rxStage(f);
  const reached = stage === "cancelled" || stage === "draft" ? -1 : FLOW.indexOf(stage);
  const at: Record<string, string | null> = {
    submitted: f.submitted_at ?? f.created_at,
    in_review: f.released_at,
    sent_to_lab: f.sent_at,
    in_production: f.lab_status_at,
    shipped: stage === "shipped" ? f.lab_status_at : null,
  };
  return FLOW.map((s, i) => ({
    stage: s,
    label: STAGE_LABELS[s],
    at: i <= reached ? at[s] ?? null : null,
    state: i < reached || (i === reached && s === "shipped") ? "done" : i === reached ? "current" : "todo",
  }));
}

/** Edit and cancel are open only while a person at Classic Visions has not released the order. */
export function rxActions(f: RxOrderFacts) {
  const stage = rxStage(f);
  const open = stage === "draft" || stage === "submitted" || (stage === "in_review" && f.submission_status === "failed");
  const edit = stage === "draft" || stage === "submitted";
  const soleItem = (f.order_item_count ?? 1) <= 1;
  const cancel = open && soleItem && !f.paid;
  return {
    edit,
    cancel,
    /** Why cancel is not offered (shown instead of the button), or null when it is. */
    cancelBlocked: open && !cancel ? (f.paid ? "This order is paid — contact us to cancel it and arrange a refund." : "This Rx order is part of a larger order — contact us to cancel it.") : null,
    reorder: stage !== "draft",
    remake: stage === "sent_to_lab" || stage === "in_production" || stage === "shipped",
  };
}

export interface RxOrderBrief { patient: string; reference: string; lens: string }

/** Patient, the customer's own reference and a one-line lens summary from the saved payload. */
export function rxBrief(payload: any): RxOrderBrief {
  const p = payload ?? {};
  const patient = [p.patient?.first, p.patient?.last].filter(Boolean).join(" ").trim();
  const names = (l: any) => [l?.material, l?.design, l?.colour].filter(Boolean).join(" · ");
  const lens = p.split && p.lensOs ? `OD ${names(p.lens)} / OS ${names(p.lensOs)}` : names(p.lens);
  return { patient, reference: typeof p.reference === "string" ? p.reference.trim() : "", lens };
}

/** Reorder: same Rx, lens and coatings, but a NEW frame — the frame, shape, order number and reference are cleared. */
export function reorderPayload(payload: any, kind: "reorder" | "remake", originalNumber: number | null): any {
  const p = JSON.parse(JSON.stringify(payload ?? {}));
  const keep = (v: unknown) => (typeof v === "string" ? v : "");
  delete p.orderNo; delete p.rebuiltFrom; delete p.createdAt; delete p.quote; delete p.flags; delete p.ownerReview;
  p.frame = {};
  p.shape = null;
  p.reference = "";
  const ref = originalNumber != null ? `#${originalNumber}` : "the original order";
  const note = kind === "remake" ? `REMAKE / warranty of Rx order ${ref}.` : `Reorder of Rx order ${ref} — new frame.`;
  p.delivery = { ...(p.delivery ?? {}), notes: [note, keep(p.delivery?.notes)].filter(Boolean).join("\n") };
  return p;
}
