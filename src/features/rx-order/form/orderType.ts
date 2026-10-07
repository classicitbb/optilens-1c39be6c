// Order type chosen at the top of the Rx order form. "rx" is the prescription
// form itself; "stock" and "service" are both stock-format orders (rx_eye 5 in
// the lab file) built from named catalog items. A service request is the same
// order with a collection marker, so the lab and staff can tell that items are
// to be collected rather than shipped.
import type { StageOrderItem } from "@/hooks/useStockOrderBuilder";

export type OrderType = "rx" | "stock" | "service";

export const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: "rx", label: "Rx order" },
  { id: "stock", label: "Stock / supplies order" },
  { id: "service", label: "Service request order" },
];

// No colon: the lab file writer replaces any colon inside a value.
export const SERVICE_REQUEST_TAG = "SERVICE REQUEST - COLLECT";

const withTag = (text: string) => {
  const t = text.trim();
  if (t.toUpperCase().startsWith(SERVICE_REQUEST_TAG)) return t;
  return t ? `${SERVICE_REQUEST_TAG} - ${t}` : SERVICE_REQUEST_TAG;
};

/** What actually gets staged: a service request stamps the marker on the order instructions and on every item comment. */
export function stageFor(
  type: Exclude<OrderType, "rx">,
  input: { instructions: string; items: StageOrderItem[] },
): { instructions: string; items: StageOrderItem[] } {
  if (type === "stock") return input;
  return {
    instructions: withTag(input.instructions),
    items: input.items.map((i) => ({ ...i, customer_ref: withTag(i.customer_ref) })),
  };
}
