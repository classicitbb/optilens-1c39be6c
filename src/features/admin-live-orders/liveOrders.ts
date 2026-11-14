// Staff view of the lab's live work: every customer's active lab orders and every
// shipment, fetched on demand from OptiLens Local through the live-data gateway
// (staff-only operations; see docs/agent-spec-all-customer-live-data.md).
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { requestLiveData } from "@/lib/liveDataGateway";

export interface LabOrder {
  order_id?: string | number | null;
  invoice_id?: number | null;
  rx_number: string | null;
  patient: string | null;
  received_at: string | null;
  promise_date?: string | null;
  status_name: string | null;
  account_number?: string | null;
  customer_name?: string | null;
}

export interface ShipmentItem {
  order_id: string | number | null;
  invoice_id?: string | number | null;
  rx_number?: string | null;
  patient?: string | null;
  description?: string | null;
  quantity?: number | null;
  status_name?: string | null;
  received_at?: string | null;
  account_number?: string | null;
  customer_name?: string | null;
}

export interface Shipment {
  shipment_session_id: string;
  source_shipment_id: string | number | null;
  app_status?: string;
  started_at: string | null;
  closed_at: string | null;
  tracking_number: string | null;
  tracking_url?: string | null;
  shipping_method_name: string | null;
  item_count: number | null;
  orders?: ShipmentItem[] | null;
}

interface LiveEnvelope {
  retrieved_at?: string;
  source_status?: string | null;
  fallback?: boolean;
  truncated?: boolean;
  error?: string;
}
export interface AllLabOrdersResponse extends LiveEnvelope { orders: LabOrder[] }
export interface AllShipmentsResponse extends LiveEnvelope { deliveries: Shipment[] }

/** Closed shipments stay visible for this long; open ones are always returned. */
export const SHIPMENT_WINDOW_DAYS = 45;

export const useAllLabOrders = (enabled: boolean) => useQuery({
  queryKey: ["live-all-lab-orders"],
  enabled,
  queryFn: ({ signal }) => requestLiveData<AllLabOrdersResponse>("innovations.all_orders", { status_scope: "active" }, { signal }),
  staleTime: 30_000,
  retry: 1,
});

export const useAllShipments = (enabled: boolean) => useQuery({
  queryKey: ["live-all-shipments"],
  enabled,
  queryFn: ({ signal }) => requestLiveData<AllShipmentsResponse>(
    "optilens.all_deliveries",
    { include_open: true, closed_since: format(subDays(new Date(), SHIPMENT_WINDOW_DAYS), "yyyy-MM-dd") },
    { signal },
  ),
  staleTime: 30_000,
  retry: 1,
});

/** True when the gateway answered without the live source (connector offline, or an agent that predates these views). */
export const isOfflineResponse = (data?: LiveEnvelope | null) => !!data && (data.source_status === "offline" || data.source_status === "unlinked" || data.fallback === true);

const includes = (query: string, values: Array<string | number | null | undefined>) =>
  values.some((value) => String(value ?? "").toLowerCase().includes(query));

export function labOrderMatches(order: LabOrder, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return includes(q, [order.rx_number, order.patient, order.order_id, order.customer_name, order.account_number, order.status_name]);
}

export const shipmentIsOpen = (shipment: Pick<Shipment, "closed_at">) => !shipment.closed_at;

export function shipmentMatches(shipment: Shipment, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return includes(q, [
    shipment.source_shipment_id, shipment.tracking_number, shipment.shipping_method_name,
    ...(shipment.orders ?? []).flatMap((i) => [i.order_id, i.invoice_id, i.rx_number, i.patient, i.customer_name, i.account_number]),
  ]);
}

/** Distinct customer names on a shipment, in order of first appearance. */
export function shipmentCustomers(shipment: Shipment): string[] {
  const names: string[] = [];
  for (const item of shipment.orders ?? []) {
    const name = item.customer_name?.trim() || item.account_number?.trim();
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

/** Shipping method names are stored as "<route #> <courier>" ("1 Tia Lewis"); the route number is noise. */
export const shippingMethodLabel = (name?: string | null) => (name ?? "").replace(/^\d+\s+/, "");

export const shipmentLabel = (s: Shipment) => String(s.source_shipment_id ?? s.shipment_session_id.slice(0, 8));

export const formatLiveDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "dd MMM yyyy HH:mm");
};

export const isSafeTrackingUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};
