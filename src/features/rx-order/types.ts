// Shared Rx Order Form — types.
//
// "One engine, two surfaces" (RX_ORDER_FORM_BUILD_PLAN.md §1): the same form
// component serves the admin surface (staff pick any ERP account, can print)
// and, later, the customer portal (account is implicit and locked). Nothing
// in the engine may import admin-only modules; surface differences are
// expressed through this context object only.

export type RxOrderSurface = "admin" | "portal";

export interface RxOrderAccountContext {
  /** Pre-selected ERP account (customers.id). Null = staff must pick. */
  accountId: number | null;
  /** True on the portal surface — the account cannot be changed. */
  locked: boolean;
}

export interface RxOrderTerminalActions {
  /** Save & Print (admin print-sheet flow). */
  print: boolean;
  /** Add the priced order to the signed-in user's cart for checkout. */
  cart: boolean;
}

export interface RxOrderFormProps {
  quoteId: string;
  surface: RxOrderSurface;
  account: RxOrderAccountContext;
  actions: RxOrderTerminalActions;
}

/** A lens colour option resolved through lens_alias_map. */
export interface LensColourOption {
  alias: string;
  color_code: string;
  color_description: string;
  is_primary: boolean;
}

export interface RxSubmissionRow {
  id: string;
  quote_id: string;
  order_id: string | null;
  account_id: number | null;
  status: string;
  dispatch_provider: "innovations" | "gatekeeper";
  transport: string | null;
  result_code: number | null;
  result_message: string | null;
  rxt_data: string | null;
  attempts: number;
  last_error: string | null;
  approved_by: string | null;
  approved_at: string | null;
  submitted_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
}
