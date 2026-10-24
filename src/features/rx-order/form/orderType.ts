// New orders offer Rx and stock/supplies. Published services are catalog items
// inside stock orders. The legacy service marker helpers remain for compatibility.
import type { StageOrderItem } from "@/hooks/useStockOrderBuilder";

export type OrderType = "rx" | "stock" | "service";

export const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: "rx", label: "Rx order" },
  { id: "stock", label: "Stock / supplies order" },
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
