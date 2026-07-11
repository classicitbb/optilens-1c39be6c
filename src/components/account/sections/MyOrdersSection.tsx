import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, Package, RefreshCw, ShoppingBag, Truck } from "lucide-react";
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
  shipping_method_name: string | null;
  item_count: number | null;
};

type LiveDeliveriesResponse = {
  deliveries: LiveDelivery[];
  retrieved_at: string;
};

type LiveRxOrder = {
  order_id: number | null;
  start_date: string | null;
  invoice_id: number | null;
  rx_number: string | null;
  patient: string | null;
  status_name: string | null;
  status_date: string | null;
};

type LiveRxOrdersResponse = {
  orders: LiveRxOrder[];
  retrieved_at: string;
};

const formatLiveDate = (value: string | null) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "MM/dd/yyyy HH:mm");
};

const MyOrdersSection = () => {
  const { orders, loading } = useOrders();
  const { canAccessFeature, identity } = usePortalIdentity();
  const canSeePrivateOrders = canAccessFeature("private-orders");
  const rxOrdersQuery = useQuery({
    queryKey: ["live-innovations-rx-order-status", identity?.crmCustomerId],
    enabled: canSeePrivateOrders && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveRxOrdersResponse>("innovations.customer_rx_order_status", {}, { signal }),
    staleTime: 30_000,
    retry: 1,
  });
  const deliveriesQuery = useQuery({
    queryKey: ["live-optilens-deliveries", identity?.crmCustomerId],
    enabled: canSeePrivateOrders && typeof identity?.crmCustomerId === "number",
    queryFn: ({ signal }) => requestLiveData<LiveDeliveriesResponse>("optilens.customer_deliveries", {}, { signal }),
    staleTime: 30_000,
    retry: 1,
  });
  const liveDeliveries = deliveriesQuery.data?.deliveries ?? [];
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
        {pendingOrders.length ? <Badge className="w-fit bg-amber-500 text-amber-950 hover:bg-amber-500">Pending {pendingOrders.length}</Badge> : null}
        {!canSeePrivateOrders ? (
          <p className="text-sm text-muted-foreground">Private/manual sales orders unlock after your customer account is approved.</p>
        ) : null}
      </header>

      {canSeePrivateOrders ? (
        <section className="space-y-3" aria-labelledby="rx-orders-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="rx-orders-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Package className="h-5 w-5" /> My Rx Order Status
              </h3>
              <p className="text-sm text-muted-foreground">Live Rx orders from Innovations for your LMS account.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => rxOrdersQuery.refetch()} disabled={rxOrdersQuery.isFetching}>
              {rxOrdersQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh Rx status
            </Button>
          </div>

          {rxOrdersQuery.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {rxOrdersQuery.error instanceof Error ? rxOrdersQuery.error.message : "Rx order status is temporarily unavailable."}
              </AlertDescription>
            </Alert>
          ) : rxOrdersQuery.isLoading ? (
            <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (rxOrdersQuery.data?.orders.length ?? 0) === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No Rx orders were found for this account.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Rx Number</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>Current Status Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rxOrdersQuery.data?.orders.map((order) => (
                      <TableRow key={order.order_id ?? `${order.rx_number}-${order.start_date}`}>
                        <TableCell className="font-medium">{order.order_id ?? "—"}</TableCell>
                        <TableCell>{formatLiveDate(order.start_date)}</TableCell>
                        <TableCell>{order.invoice_id ?? "—"}</TableCell>
                        <TableCell>{order.rx_number ?? "—"}</TableCell>
                        <TableCell>{order.patient ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{order.status_name ?? "—"}</Badge></TableCell>
                        <TableCell>{formatLiveDate(order.status_date)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {rxOrdersQuery.data?.retrieved_at ? (
            <p className="text-xs text-muted-foreground" role="status">
              Live response received {format(new Date(rxOrdersQuery.data.retrieved_at), "PPP 'at' p")}.
            </p>
          ) : null}
        </section>
      ) : null}

      {canSeePrivateOrders ? (
        <section className="space-y-3" aria-labelledby="live-deliveries-heading">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="live-deliveries-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Truck className="h-5 w-5" /> Live delivery status
              </h3>
              <p className="text-sm text-muted-foreground">Fetched from OptiLens Local only when this page is opened.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => deliveriesQuery.refetch()} disabled={deliveriesQuery.isFetching}>
              {deliveriesQuery.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh live status
            </Button>
          </div>

          {deliveriesQuery.isError ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>
                {deliveriesQuery.error instanceof Error ? deliveriesQuery.error.message : "Live delivery status is temporarily unavailable."}
              </AlertDescription>
            </Alert>
          ) : deliveriesQuery.isLoading ? (
            <Card><CardContent className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : liveDeliveries.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No OptiLens deliveries were found in the last 90 days.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead className="text-right">Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {liveDeliveries.map((delivery) => (
                      <TableRow key={delivery.shipment_session_id}>
                        <TableCell className="font-medium">#{delivery.source_shipment_id ?? delivery.shipment_session_id.slice(0, 8)}</TableCell>
                        <TableCell><Badge variant="outline">{delivery.source_shipped ? "Shipped" : delivery.app_status || "Preparing"}</Badge></TableCell>
                        <TableCell>{delivery.shipping_method_name || "—"}</TableCell>
                        <TableCell>{delivery.tracking_number || "Not assigned"}</TableCell>
                        <TableCell className="text-right">{delivery.item_count ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
          {deliveriesQuery.data?.retrieved_at ? (
            <p className="text-xs text-muted-foreground" role="status">
              Live response received {format(new Date(deliveriesQuery.data.retrieved_at), "PPP 'at' p")}.
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
            <section key={group.key} className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{group.title}</h3>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </div>
              {group.orders.map((order, index) => (
                <Card key={order.id} className="animate-fade-in opacity-0" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  <CardContent>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="items" className="border-none">
                        <AccordionTrigger className="py-2 text-sm hover:no-underline">
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
