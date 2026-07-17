import { format, subDays } from "date-fns";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Loader2, Package, RefreshCw, Search, ShoppingBag, Truck } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestLiveData } from "@/lib/liveDataGateway";


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
};

type LiveInnovationsOrder = {
  rx_number: string | null;
  patient: string | null;
  received_at: string | null;
  status_name: string | null;
};

type LiveInnovationsOrdersResponse = {
  orders: LiveInnovationsOrder[];
  retrieved_at: string;
};

const formatLiveDate = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "MM/dd/yyyy HH:mm");
};

const liveDeliveryId = (delivery: LiveDelivery) => delivery.source_shipment_id ?? delivery.shipment_session_id.slice(0, 8);

const isSafeTrackingUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const LiveDeliveryCard = ({ delivery }: { delivery: LiveDelivery }) => {
  const trackingUrl = isSafeTrackingUrl(delivery.tracking_url);
  const shipmentItems = delivery.orders ?? [];
  const isOpen = !delivery.closed_at;

  return (
    <Accordion type="single" collapsible className="rounded-lg border bg-card px-3 sm:px-4">
      <AccordionItem value={delivery.shipment_session_id} className="border-none">
        <AccordionTrigger className="py-3 text-left hover:no-underline">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 pr-3">
            <span className="font-medium text-foreground">Shipment #{liveDeliveryId(delivery)}</span>
            <Badge variant="outline">{isOpen ? "Open" : "Closed"}</Badge>
            <span className="text-sm text-muted-foreground">{delivery.shipping_method_name || "Delivery method pending"}</span>
            <span className="text-sm text-muted-foreground">{delivery.item_count ?? shipmentItems.length} item{(delivery.item_count ?? shipmentItems.length) === 1 ? "" : "s"}</span>
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
                  </TableRow>
                ))}
              </TableBody>
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
  // Under admin emulation the gateway must fetch the emulated customer's data,
  // not the admin's; staff-only override honored server-side.
  const websiteCustomerId = emulation && typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : undefined;
  const [innovationsSearch, setInnovationsSearch] = useState("");
  const innovationsOrdersQuery = useQuery({
    queryKey: ["live-innovations-customer-orders", identity?.crmCustomerId],
    enabled: canSeeLiveOrderStatus && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveInnovationsOrdersResponse>("innovations.customer_orders", {}, { signal, websiteCustomerId }),
    staleTime: 30_000,
    retry: 1,
  });
  const deliveriesQuery = useQuery({
    queryKey: ["live-optilens-deliveries", identity?.crmCustomerId],
    enabled: canSeeLiveOrderStatus && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveDeliveriesResponse>(
      "optilens.customer_deliveries",
      { include_open: true, closed_since: format(subDays(new Date(), 45), "yyyy-MM-dd") },
      { signal, websiteCustomerId },
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
  const pendingOrders = orders.filter((order) => ["draft", "pending", "confirmed", "processing"].includes(order.status));
  const completedOrders = orders.filter((order) => order.status === "completed");
  const otherOrders = orders.filter((order) => !["draft", "pending", "confirmed", "processing", "completed"].includes(order.status));

  const groupedOrders = [
    { key: "pending", title: "Pending orders", description: "Orders currently in progress or awaiting fulfillment.", orders: pendingOrders },
    { key: "completed", title: "Completed orders", description: "Orders that have been fully completed.", orders: completedOrders },
    { key: "other", title: "Other statuses", description: "Cancelled, shipped, or other order states.", orders: otherOrders },
  ].filter((group) => group.orders.length > 0);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">Order History</h2>
        <p className="text-sm text-muted-foreground">View your past orders and track their status.</p>
        <nav className="flex flex-wrap gap-2 pt-1" aria-label="Jump to order sections">
          {pendingOrders.length ? <a href="#pending-orders"><Badge className="cursor-pointer bg-amber-500 text-amber-950 hover:bg-amber-500">Pending {pendingOrders.length}</Badge></a> : null}
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
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => innovationsOrdersQuery.refetch()} disabled={innovationsOrdersQuery.isFetching}>
                {innovationsOrdersQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Refresh order status
              </Button>
            </div>
          </div>

          {innovationsOrdersQuery.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {innovationsOrdersQuery.error instanceof Error ? innovationsOrdersQuery.error.message : "Order status is temporarily unavailable."}
              </AlertDescription>
            </Alert>
          ) : innovationsOrdersQuery.isLoading ? (
            <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (innovationsOrdersQuery.data?.orders.length ?? 0) === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active lab orders were found for this account.</CardContent></Card>
          ) : filteredInnovationsOrders.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active lab orders match that patient name or Rx number.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rx Number</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredInnovationsOrders.map((order) => (
                      <TableRow key={`${order.rx_number ?? "order"}-${order.received_at ?? "unknown"}`}>
                        <TableCell>{order.rx_number ?? "—"}</TableCell>
                        <TableCell>{order.patient ?? "—"}</TableCell>
                        <TableCell>{formatLiveDate(order.received_at)}</TableCell>
                        <TableCell><Badge variant="outline">{order.status_name ?? "—"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {innovationsOrdersQuery.data?.retrieved_at ? (
            <p className="text-xs text-muted-foreground" role="status">
              Response received {format(new Date(innovationsOrdersQuery.data.retrieved_at), "PPP 'at' p")}.
            </p>
          ) : null}
        </section>
      ) : null}

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
            <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : liveDeliveries.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No open shipments or recently closed deliveries were found.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Open shipments are shown regardless of age; closed deliveries remain available for 45 days.</p>
              {liveDeliveries.map((delivery) => <LiveDeliveryCard key={delivery.shipment_session_id} delivery={delivery} />)}
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
      ) : orders.length === 0 ? (
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="py-12">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold text-foreground">No orders yet</h3>
            <p className="text-muted-foreground">When you complete a purchase, your orders will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map((group) => (
            <section key={group.key} id={`${group.key}-orders`} className="space-y-3 scroll-mt-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
              {group.orders.map((order, index) => (
                <Card key={order.id} className="animate-fade-in opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardHeader className="p-3 sm:px-4 sm:py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Package className="h-5 w-5" />
                          Order #{order.id.slice(0, 8).toUpperCase()}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(order.createdAt), "PPP 'at' p")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getStatusColor(order.status)}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                        <span className="text-xl font-bold text-foreground">${order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 sm:px-4 sm:pb-3">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="items" className="border-none">
                        <AccordionTrigger className="py-1 text-sm hover:no-underline">
                          View {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
                        </AccordionTrigger>
                        <AccordionContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Qty</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {order.items?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">{item.productName}</TableCell>
                                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">${(item.unitPrice * item.quantity).toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </section>
  );
};

export default MyOrdersSection;
