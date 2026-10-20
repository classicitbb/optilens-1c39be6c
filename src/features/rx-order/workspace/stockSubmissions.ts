import type { StockOrderDraft } from "@/hooks/useStockOrderBuilder";

export interface StockSubmissionRow extends StockOrderDraft {
  quote_id: string | null;
  order_id: string | null;
  dispatch_provider: "innovations" | "gatekeeper" | null;
  transport: string | null;
  filename: string | null;
  attempts: number;
  last_error: string | null;
  released_at: string | null;
  gatekeeper_order_id: number | null;
  receipt: unknown;
  lab_status: string | null;
  lab_status_detail: string | null;
  lab_status_at: string | null;
}
