export const RECORD_LIFECYCLE_STATUSES = ["draft", "active", "inactive", "archived"] as const;
export type RecordLifecycleStatus = (typeof RECORD_LIFECYCLE_STATUSES)[number];

export const VISIBILITY_SCOPES = ["private", "internal", "restricted", "customer", "public"] as const;
export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export const SOURCE_CATEGORIES = [
  "manual",
  "import",
  "integration",
  "automation",
  "assistant",
  "system",
] as const;
export type SourceCategory = (typeof SOURCE_CATEGORIES)[number];

export const ORDER_STATUSES = ["draft", "pending", "pending_payment", "confirmed", "processing", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "expired", "rejected", "cancelled"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const JOB_STATUSES = ["draft", "queued", "in_progress", "blocked", "completed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const SHIPMENT_STATUSES = ["draft", "packed", "in_transit", "delivered", "returned", "cancelled"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "void", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = ["initiated", "authorized", "settled", "failed", "refunded", "void", "pending_review"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const TICKET_STATUSES = ["new", "triaged", "in_progress", "waiting_on_customer", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const ASSISTANT_SESSION_STATUSES = ["open", "idle", "resolved", "closed"] as const;
export type AssistantSessionStatus = (typeof ASSISTANT_SESSION_STATUSES)[number];

