import { format, subDays } from "date-fns";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Loader2, Package, Printer, RefreshCw, Search, ShoppingBag, Truck } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useAccountPayments } from "@/hooks/useAccountPayments";
import type { OrderEntity } from "@/domain/entities";
import { cn } from "@/lib/utils";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { printOrderDocument } from "@/features/admin/print/orderDocument";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { requestLiveData } from "@/lib/liveDataGateway";
import InquireButton from "@/components/account/InquireButton";


const formatAddress = (address?: Record<string, unknown> | null) => {
  if (!address) return "—";
  const values = [
    typeof address.recipient === "string" ? address.recipient : "",
    typeof address.line1 === "string" ? address.line1 : "",
    typeof address.city === "string" ? address.city : "",
    typeof address.country === "string" ? address.country : "",
  ].filter(Boolean);
  return values.length ? values.join(", ") : "—";
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-500 border-green-500/20";
    case "pending":
      return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "cancelled":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

type OrderBucket = "pending" | "completed" | "other";

const PENDING_STATUSES = ["draft", "pending", "pending_payment", "confirmed", "processing"];

const bucketForStatus = (status: string): OrderBucket => {
  if (PENDING_STATUSES.includes(status)) return "pending";
  if (status === "completed") return "completed";
  return "other";
};

const ORDER_FILTERS: { value: OrderBucket | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "all", label: "All" },
  { value: "completed", label: "Completed" },
  { value: "other", label: "Other" },
];

type OrderRow = {
  key: string;
  kind: "order" | "payment";
  reference: string;
  typeLabel: string;
  date: string;
  status: string;
  statusLabel: string;
  bucket: OrderBucket;
  itemCount: number;
  total: number;
  order: OrderEntity | null;
};

type LiveDelivery = {
  shipment_session_id: string;
  source_shipment_id: string | number | null;
  app_status: string;
  source_shipped: boolean | null;
  started_at: string | null;
  closed_at: string | null;
  tracking_number: string | null;
  tracking_url?: string | null;
  shipping_method_name: string | null;
  item_count: number | null;
  orders?: LiveDeliveryItem[] | null;
};

type LiveDeliveryItem = {
  order_id: string | number | null;
  rx_number?: string | null;
  patient?: string | null;
  description?: string | null;
  quantity?: number | null;
  status_name?: string | null;
};

type LiveDeliveriesResponse = {
  deliveries: LiveDelivery[];
  retrieved_at: string;
  source_status?: string | null;
  fallback?: boolean;
};

type LiveInnovationsOrder = {
  rx_number: string | null;
  patient: string | null;
  received_at: string | null;
  promise_date?: string | null;
  status_name: string | null;
};

type LiveInnovationsOrdersResponse = {
  orders: LiveInnovationsOrder[];
  retrieved_at: string;
  source_status?: string | null;
  fallback?: boolean;
};


const formatLiveDate = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "MM/dd/yyyy HH:mm");
};

// The lab/shipment bridge response is passed through untyped (see
// liveDataGateway.ts), so a price field — if the source sends one at all —
// may arrive under any of these conventional keys. Read defensively and fall
// back to "no price data" rather than guessing wrong.
const PRICE_FIELD_CANDIDATES = ["price", "unit_price", "line_total", "total_price", "amount", "total_amount", "sell_price"];
const readItemPrice = (item: unknown): number | null => {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;
  for (const key of PRICE_FIELD_CANDIDATES) {
    const raw = record[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) return Number(raw);
  }
  return null;
};
const formatLivePrice = (value: number | null) => (value == null ? "—" : `$${value.toFixed(2)}`);
const INNOVATIONS_ORDERS_PAGE_SIZE = 10;

const liveDeliveryId = (delivery: LiveDelivery) => delivery.source_shipment_id ?? delivery.shipment_session_id.slice(0, 8);

// Shipping method names are stored in the lab system as "<route #> <courier name>"
// (e.g. "1 Tia Lewis"); the route number isn't meaningful to the customer.
const formatShippingMethodName = (name?: string | null) => (name ?? "").replace(/^\d+\s+/, "");

const isSafeTrackingUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const LiveDeliveryCard = ({ delivery, showPrices }: { delivery: LiveDelivery; showPrices: boolean }) => {
  const trackingUrl = isSafeTrackingUrl(delivery.tracking_url);
  const shipmentItems = delivery.orders ?? [];
  const shipmentRowCount = shipmentItems.length;
  const isOpen = !delivery.closed_at;
  const shippingMethodName = formatShippingMethodName(delivery.shipping_method_name);
  const shipmentPrices = shipmentItems.map((item) => readItemPrice(item));
  const shipmentTotal = showPrices && shipmentPrices.some((value) => value != null)
    ? shipmentPrices.reduce((sum, value) => sum + (value ?? 0), 0)
    : null;

  return (
    <Accordion type="single" collapsible className="rounded-lg border bg-card px-3 sm:px-4">
      <AccordionItem value={delivery.shipment_session_id} className="border-none">
        <div className="flex items-center gap-1">
          <div className="min-w-0 flex-1">
            <AccordionTrigger className="py-3 text-left hover:no-underline">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 pr-3">
                <span className="font-medium text-foreground">Shipment #{liveDeliveryId(delivery)}</span>
                <Badge variant="outline">{isOpen ? "Open" : "Closed"}</Badge>
                {!isOpen ? (
                  <span className="text-sm text-muted-foreground">Closed {formatLiveDate(delivery.closed_at)}</span>
                ) : null}
                <span className="text-sm text-muted-foreground">{shippingMethodName || "Delivery method pending"}</span>
                <span className="text-sm text-muted-foreground">{shipmentRowCount} item{shipmentRowCount === 1 ? "" : "s"}</span>
                {delivery.tracking_number ? (
                  trackingUrl ? (
                    <a
                      href={trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Track {delivery.tracking_number} <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : <span className="text-sm text-muted-foreground">Tracking {delivery.tracking_number}</span>
                ) : null}
              </div>
            </AccordionTrigger>
          </div>
          <InquireButton
            label="Ask about this shipment"
            title={`Inquiry about Shipment #${liveDeliveryId(delivery)}`}
            description={[
              `Shipment #${liveDeliveryId(delivery)}`,
              `Status: ${isOpen ? "Open" : "Closed"}`,
              `Shipping method: ${shippingMethodName || "—"}`,
              `Items: ${shipmentRowCount}`,
              delivery.tracking_number ? `Tracking #: ${delivery.tracking_number}` : null,
              "",
              "Question: ",
            ].filter((line) => line !== null).join("\n")}
          />
        </div>
        <AccordionContent className="pb-3">
          {shipmentItems.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Rx</TableHead>
                  <TableHead>Patient / item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  {showPrices ? <TableHead className="text-right">Price (BBD)</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipmentItems.map((item, index) => (
                  <TableRow key={`${item.order_id ?? "item"}-${item.rx_number ?? index}`}>
                    <TableCell className="font-medium">{item.order_id ?? "—"}</TableCell>
                    <TableCell>{item.rx_number ?? "—"}</TableCell>
                    <TableCell>{item.patient || item.description || "—"}</TableCell>
                    <TableCell className="text-right">{item.quantity ?? "—"}</TableCell>
                    <TableCell>{item.status_name ?? "—"}</TableCell>
                    {showPrices ? <TableCell className="text-right">{formatLivePrice(shipmentPrices[index])}</TableCell> : null}
                  </TableRow>
                ))}
              </TableBody>
              {showPrices ? (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} />
                    <TableCell className="text-right font-semibold">Total</TableCell>
                    <TableCell className="text-right font-semibold">{formatLivePrice(shipmentTotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              ) : null}
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Shipment details are not available yet.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

const MyOrdersSection = () => {
  const { canAccessFeature, identity, emulation } = usePortalIdentity();
  const { orders, loading } = useOrders(emulation?.userId);
  const canSeePrivateOrders = canAccessFeature("private-orders");
  const canSeeLiveOrderStatus = canAccessFeature("live-order-status");
  const showPrices = canAccessFeature("order-prices");
  // Under admin emulation the gateway must fetch the emulated customer's data,
  // not the admin's; staff-only override honored server-side.
  const websiteCustomerId = typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : undefined;
  const localFallbackTarget = { accountNumber: identity?.accountNumber ?? null, ordersUseBillToAccount: identity?.ordersUseBillToAccount ?? false };
  const [innovationsSearch, setInnovationsSearch] = useState("");
  const [innovationsVisibleCount, setInnovationsVisibleCount] = useState(INNOVATIONS_ORDERS_PAGE_SIZE);
  const innovationsOrdersQuery = useQuery({
    queryKey: ["live-innovations-customer-orders", identity?.crmCustomerId],
    enabled: canSeeLiveOrderStatus && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveInnovationsOrdersResponse>("innovations.customer_orders", {}, { signal, websiteCustomerId, localFallbackTarget }),
    staleTime: 30_000,
    retry: 1,
  });
  const deliveriesQuery = useQuery({
    queryKey: ["live-optilens-deliveries", identity?.crmCustomerId],
    enabled: canSeeLiveOrderStatus && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveDeliveriesResponse>(
      "optilens.customer_deliveries",
      { include_open: true, closed_since: format(subDays(new Date(), 45), "yyyy-MM-dd") },
      { signal, websiteCustomerId, localFallbackTarget },
    ),
    staleTime: 30_000,
    retry: 1,
  });
  const liveDeliveries = deliveriesQuery.data?.deliveries ?? [];
  const filteredInnovationsOrders = useMemo(() => {
    const query = innovationsSearch.trim().toLocaleLowerCase();
    if (!query) return innovationsOrdersQuery.data?.orders ?? [];
    return (innovationsOrdersQuery.data?.orders ?? []).filter((order) =>
      [order.patient, order.rx_number].some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [innovationsOrdersQuery.data?.orders, innovationsSearch]);
  // Search always runs against the full fetched set above; only the on-screen
  // slice is paginated, and a new search starts back at the first page.
  useEffect(() => {
    setInnovationsVisibleCount(INNOVATIONS_ORDERS_PAGE_SIZE);
  }, [innovationsSearch]);
  const visibleInnovationsOrders = filteredInnovationsOrders.slice(0, innovationsVisibleCount);
  const innovationsPrices = filteredInnovationsOrders.map((order) => readItemPrice(order));

  const paymentsQuery = useAccountPayments(emulation?.userId);
  const [orderFilter, setOrderFilter] = useState<OrderBucket | "all">("pending");
  const [orderSearch, setOrderSearch] = useState("");
  const [expandedOrderKey, setExpandedOrderKey] = useState<string | null>(null);
  const [selectedLabOrder, setSelectedLabOrder] = useState<LiveInnovationsOrder | null>(null);

  const orderRows = useMemo<OrderRow[]>(() => {
    const webRows: OrderRow[] = orders.map((order) => ({
      key: `order-${order.id}`,
      kind: "order",
      reference: `#${order.id.slice(0, 8).toUpperCase()}`,
      typeLabel: "Web order",
      date: order.createdAt,
      status: order.status,
      statusLabel: order.status === "pending_payment"
        ? "Awaiting payment"
        : order.status.charAt(0).toUpperCase() + order.status.slice(1).replace(/_/g, " "),
      bucket: bucketForStatus(order.status),
      itemCount: order.items?.length ?? 0,
      total: order.totalAmount,
      order,
    }));
    const paymentRows: OrderRow[] = (paymentsQuery.data ?? []).map((payment) => ({
      key: `payment-${payment.id}`,
      kind: "payment",
      reference: `#${(payment.reference ?? payment.id.slice(0, 8)).toUpperCase()}`,
      typeLabel: "Statement payment",
      date: payment.confirmedAt ?? payment.createdAt,
      status: "completed",
      statusLabel: "Paid",
      bucket: "completed",
      itemCount: 0,
      total: payment.amount,
      order: null,
    }));
    return [...webRows, ...paymentRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [orders, paymentsQuery.data]);

  const bucketCounts = useMemo(() => ({
    pending: orderRows.filter((row) => row.bucket === "pending").length,
    completed: orderRows.filter((row) => row.bucket === "completed").length,
    other: orderRows.filter((row) => row.bucket === "other").length,
    all: orderRows.length,
  }), [orderRows]);

  const visibleOrderRows = useMemo(() => {
    const query = orderSearch.trim().toLocaleLowerCase();
    return orderRows.filter((row) => {
      if (orderFilter !== "all" && row.bucket !== orderFilter) return false;
      if (!query) return true;
      const haystack = [
        row.reference,
        row.typeLabel,
        row.statusLabel,
        row.total.toFixed(2),
        format(new Date(row.date), "PPP"),
        ...(row.order?.items ?? []).map((item) => item.productName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      return haystack.includes(query);
    });
  }, [orderRows, orderFilter, orderSearch]);

  const pendingCount = bucketCounts.pending;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Order History</h2>
        <p className="text-sm text-muted-foreground">View your past orders and track their status.</p>
        <nav className="flex flex-wrap gap-2 pt-1" aria-label="Jump to order sections">
          {pendingCount ? <a href="#pending-orders"><Badge className="cursor-pointer bg-amber-500 text-amber-950 hover:bg-amber-500">Pending {pendingCount}</Badge></a> : null}
          {canSeeLiveOrderStatus ? <a href="#innovations-orders-heading"><Badge variant="outline" className="cursor-pointer">Lab orders {innovationsOrdersQuery.data?.orders.length ?? 0}</Badge></a> : null}
          {canSeeLiveOrderStatus ? <a href="#live-deliveries-heading"><Badge variant="outline" className="cursor-pointer">Shipments {liveDeliveries.length}</Badge></a> : null}
        </nav>
        {!canSeePrivateOrders ? (
          <p className="text-sm text-muted-foreground">Private/manual sales orders unlock after your customer account is approved.</p>
        ) : null}
      </header>

      {canSeeLiveOrderStatus ? (
        <section className="space-y-3" aria-labelledby="innovations-orders-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="innovations-orders-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Package className="h-5 w-5" /> Order status
              </h3>
              <p className="text-sm text-muted-foreground">Active lab work and valid shipments made today for your account.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  value={innovationsSearch}
                  onChange={(event) => setInnovationsSearch(event.target.value)}
                  placeholder="Search patient or Rx #"
                  aria-label="Search lab orders by patient name or Rx number"
                  className="h-9 pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => innovationsOrdersQuery.refetch()} disabled={innovationsOrdersQuery.isFetching}>
                {innovationsOrdersQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh order status
              </Button>
            </div>
          </div>

          {innovationsOrdersQuery.data?.source_status === "cached" ? (
            <Alert>
              <AlertDescription>
                The live lab connection is unavailable, so these are your most recent invoiced orders from billing records. Work still in progress may not appear until the connection is restored.
              </AlertDescription>
            </Alert>
          ) : innovationsOrdersQuery.data?.source_status === "offline" ? (
            <Alert>
              <AlertDescription>
                The live lab connection is offline, so order status can&apos;t be shown right now.
              </AlertDescription>
            </Alert>
          ) : null}

          {innovationsOrdersQuery.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {innovationsOrdersQuery.error instanceof Error ? innovationsOrdersQuery.error.message : "Order status is temporarily unavailable."}
              </AlertDescription>
            </Alert>
          ) : innovationsOrdersQuery.isLoading ? (
            <Card className="border-0 shadow-sm md:border"><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (innovationsOrdersQuery.data?.orders.length ?? 0) === 0 ? (
            <Card className="border-0 shadow-sm md:border"><CardContent className="py-8 text-center text-sm text-muted-foreground">No active lab orders were found for this account.</CardContent></Card>

          ) : filteredInnovationsOrders.length === 0 ? (
            <Card className="border-0 shadow-sm md:border"><CardContent className="py-8 text-center text-sm text-muted-foreground">No active lab orders match that patient name or Rx number.</CardContent></Card>
          ) : (
            <Card className="overflow-hidden border-0 shadow-sm md:border">
              <CardContent className="overflow-x-auto p-0">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rx Number</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Promise Date</TableHead>
                        <TableHead>Status</TableHead>
                        {showPrices ? <TableHead className="text-right">Price (BBD)</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {visibleInnovationsOrders.map((order, index) => (
                      <TableRow
                        key={`${order.rx_number ?? "order"}-${order.received_at ?? "unknown"}`}
                        className="cursor-pointer focus-within:bg-muted/50 hover:bg-muted/50"
                        onClick={() => setSelectedLabOrder(order)}
                        aria-label={`View invoice details for ${order.patient ?? order.rx_number ?? "lab order"}`}
                      >
                        <TableCell>{order.rx_number ?? "—"}</TableCell>
                        <TableCell>{order.patient ?? "—"}</TableCell>
                        <TableCell>{formatLiveDate(order.received_at)}</TableCell>
                        <TableCell>{formatLiveDate(order.promise_date ?? null)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">{order.status_name ?? "—"}</Badge>
                            <span onClick={(event) => event.stopPropagation()}><InquireButton
                              label="Ask about this order"
                              title={`Inquiry about ${order.patient ?? "patient"} — Rx ${order.rx_number ?? "—"}`}
                              description={[
                                `Rx Number: ${order.rx_number ?? "—"}`,
                                `Patient: ${order.patient ?? "—"}`,
                                `Received: ${formatLiveDate(order.received_at)}`,
                                `Promise Date: ${formatLiveDate(order.promise_date ?? null)}`,
                                `Status: ${order.status_name ?? "—"}`,
                                "",
                                "Question: ",
                              ].join("\n")}
                            /></span>
                          </div>
                        </TableCell>
                        {showPrices ? <TableCell className="text-right">{formatLivePrice(innovationsPrices[index])} BBD</TableCell> : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              {filteredInnovationsOrders.length > innovationsVisibleCount ? (
                <div className="flex items-center justify-between gap-3 border-t p-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {visibleInnovationsOrders.length} of {filteredInnovationsOrders.length} orders.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInnovationsVisibleCount((count) => count + INNOVATIONS_ORDERS_PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                </div>
              ) : null}
            </Card>
          )}
          {innovationsOrdersQuery.data?.retrieved_at ? (
            <p className="text-xs text-muted-foreground" role="status">
              Response received {format(new Date(innovationsOrdersQuery.data.retrieved_at), "PPP 'at' p")}.
            </p>
          ) : null}
        </section>
      ) : null}

      <Dialog open={!!selectedLabOrder} onOpenChange={(open) => !open && setSelectedLabOrder(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice details · Rx {selectedLabOrder?.rx_number ?? "—"}</DialogTitle>
            <DialogDescription>Lab-order information for {selectedLabOrder?.patient ?? "this patient"}.</DialogDescription>
          </DialogHeader>
          <dl className="grid gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Patient</dt><dd className="font-medium">{selectedLabOrder?.patient ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Status</dt><dd className="font-medium">{selectedLabOrder?.status_name ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Received</dt><dd className="font-medium">{formatLiveDate(selectedLabOrder?.received_at ?? null)}</dd></div>
            <div><dt className="text-muted-foreground">Promise date</dt><dd className="font-medium">{formatLiveDate(selectedLabOrder?.promise_date ?? null)}</dd></div>
          </dl>
          {showPrices ? <div className="rounded-lg border p-4"><div className="flex items-center justify-between"><span className="font-medium">Invoice total</span><span className="font-semibold">{formatLivePrice(readItemPrice(selectedLabOrder))} BBD</span></div><p className="mt-2 text-xs text-muted-foreground">Itemized invoice lines appear here when the billing connector provides them.</p></div> : null}
        </DialogContent>
      </Dialog>

      {canSeeLiveOrderStatus ? (
        <section className="space-y-3" aria-labelledby="live-deliveries-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="live-deliveries-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Truck className="h-5 w-5" /> Delivery status
              </h3>
              <p className="text-sm text-muted-foreground">Fetched from your account data.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => deliveriesQuery.refetch()} disabled={deliveriesQuery.isFetching}>
              {deliveriesQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh status
            </Button>
          </div>

          {deliveriesQuery.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {deliveriesQuery.error instanceof Error ? deliveriesQuery.error.message : "Delivery status is temporarily unavailable."}
              </AlertDescription>
            </Alert>
          ) : deliveriesQuery.isLoading ? (
            <Card className="border-0 shadow-sm md:border"><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : liveDeliveries.length === 0 ? (
            <Card className="border-0 shadow-sm md:border"><CardContent className="py-8 text-center text-sm text-muted-foreground">
              {deliveriesQuery.data?.source_status === "offline"
                ? "The live shipment connection is offline, so deliveries can't be shown right now."
                : "No open shipments or recently closed deliveries were found."}
            </CardContent></Card>

          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Open shipments are shown regardless of age; closed deliveries remain available for 45 days.</p>
              {liveDeliveries.map((delivery) => <LiveDeliveryCard key={delivery.shipment_session_id} delivery={delivery} showPrices={showPrices} />)}
            </div>
          )}
          {deliveriesQuery.data?.retrieved_at ? (
            <p className="text-xs text-muted-foreground" role="status">
              Response received {format(new Date(deliveriesQuery.data.retrieved_at), "PPP 'at' p")}.
            </p>
          ) : null}
        </section>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : orderRows.length === 0 ? (
        <Card className="mx-auto max-w-md border-0 text-center shadow-sm md:border">
          <CardContent className="py-12">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground transition-transform hover:scale-110" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">No orders yet</h3>
            <p className="text-muted-foreground">When you complete a purchase, your orders will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-3 scroll-mt-6" id="pending-orders" aria-labelledby="web-orders-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="web-orders-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <ShoppingBag className="h-5 w-5" /> Web orders &amp; payments
              </h3>
              <p className="text-sm text-muted-foreground">Orders placed online, plus statement payments received.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div
                role="tablist"
                aria-label="Filter orders by status"
                className="inline-flex items-center gap-1 rounded-md border bg-muted p-1"
              >
                {ORDER_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    role="tab"
                    aria-selected={orderFilter === filter.value}
                    onClick={() => setOrderFilter(filter.value)}
                    className={cn(
                      "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
                      orderFilter === filter.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter.label} {bucketCounts[filter.value]}
                  </button>
                ))}
              </div>
              <div className="relative sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  value={orderSearch}
                  onChange={(event) => setOrderSearch(event.target.value)}
                  placeholder="Search orders"
                  aria-label="Search orders by number, status, date, total or product"
                  className="h-9 pl-9"
                />
              </div>
            </div>
          </div>

          <Card className="overflow-hidden border-0 shadow-sm md:border">
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total (USD)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleOrderRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        No orders match this filter or search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleOrderRows.map((row) => {
                      const isExpanded = expandedOrderKey === row.key;
                      return (
                        <Fragment key={row.key}>
                          <TableRow className="group transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium transition-colors group-hover:text-primary">Order {row.reference}</TableCell>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {format(new Date(row.date), "PPP 'at' p")}
                            </TableCell>
                            <TableCell className="text-sm">{row.typeLabel}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getStatusColor(row.bucket === "completed" ? "completed" : row.status)}>
                                {row.statusLabel}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{row.kind === "payment" ? "—" : row.itemCount}</TableCell>
                            <TableCell className="text-right font-semibold">${row.total.toFixed(2)} USD</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {row.order ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9"
                                      aria-label="Print order"
                                      title="Print order"
                                      onClick={() => printOrderDocument({
                                        id: row.order!.id,
                                        createdAt: row.order!.createdAt,
                                        totalAmount: row.order!.totalAmount,
                                        status: row.order!.status,
                                        customerName: row.order!.customerName,
                                        contactEmail: row.order!.contactEmail,
                                        contactPhone: row.order!.contactPhone,
                                        shippingAddress: row.order!.shippingAddress,
                                        checkoutMethod: row.order!.checkoutMethod,
                                        items: (row.order!.items ?? []).map((item) => ({
                                          id: item.id,
                                          productName: item.productName,
                                          productType: item.productType,
                                          unitPrice: item.unitPrice,
                                          quantity: item.quantity,
                                        })),
                                      })}
                                    >
                                      <Printer className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-expanded={isExpanded}
                                      onClick={() => setExpandedOrderKey(isExpanded ? null : row.key)}
                                    >
                                      {isExpanded ? "Hide items" : `View ${row.itemCount} item${row.itemCount === 1 ? "" : "s"}`}
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Applied to account</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && row.order ? (
                            <TableRow>
                              <TableCell colSpan={7} className="bg-muted/40">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Product</TableHead>
                                      <TableHead className="text-right">Price (USD)</TableHead>
                                      <TableHead className="text-right">Qty</TableHead>
                                      <TableHead className="text-right">Total (USD)</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {(row.order.items ?? []).map((item) => (
                                      <TableRow key={item.id}>
                                        <TableCell className="font-medium">{item.productName}</TableCell>
                                        <TableCell className="text-right">${item.unitPrice.toFixed(2)} USD</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${(item.unitPrice * item.quantity).toFixed(2)} USD</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {row.order.status === "draft" && row.order.checkoutMethod === "on_account" ? (
                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-primary/20 bg-primary/5 p-3">
                                    <p className="text-sm text-muted-foreground">This account order was returned for changes. Restore its saved draft to your cart, update the items, then check out again.</p>
                                    <Button asChild size="sm">
                                      <Link to="/profile/drafts">Open saved draft</Link>
                                    </Button>
                                  </div>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </section>
  );
};

export default MyOrdersSection;
