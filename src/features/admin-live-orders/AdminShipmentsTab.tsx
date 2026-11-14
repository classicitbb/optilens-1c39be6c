// "Shipments" on /admin/orders: every shipment (delivery run) across all customers,
// open or closed, with its contents on click — the same feed the customer profile
// shows under "Delivery status".
import { Fragment, useMemo, useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Loader2, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { orderAgeBand, orderAgeTint } from "@/lib/orderAge";
import {
  formatLiveDate, isOfflineResponse, isSafeTrackingUrl, shipmentCustomers, shipmentIsOpen, shipmentLabel,
  SHIPMENT_WINDOW_DAYS, shipmentMatches, shippingMethodLabel, type AllShipmentsResponse, type Shipment,
} from "./liveOrders";

const ALL = "all";
type StatusFilter = "all" | "open" | "closed";
const NO_SHIPMENTS: Shipment[] = [];

const shipmentDay = (s: Shipment) => (s.closed_at ?? s.started_at ?? "").slice(0, 10);

interface Props {
  query: UseQueryResult<AllShipmentsResponse>;
  search: string;
}

export default function AdminShipmentsTab({ query, search }: Props) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [method, setMethod] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const all = query.data?.deliveries ?? NO_SHIPMENTS;
  const searched = useMemo(() => all.filter((s) => shipmentMatches(s, search)), [all, search]);
  const openCount = searched.filter(shipmentIsOpen).length;

  const methods = useMemo(
    () => [...new Set(searched.map((s) => shippingMethodLabel(s.shipping_method_name)).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [searched],
  );

  const rows = useMemo(() => searched.filter((s) => {
    if (status === "open" && !shipmentIsOpen(s)) return false;
    if (status === "closed" && shipmentIsOpen(s)) return false;
    if (method !== ALL && shippingMethodLabel(s.shipping_method_name) !== method) return false;
    const day = shipmentDay(s);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }).sort((a, b) => Number(shipmentIsOpen(b)) - Number(shipmentIsOpen(a)) || shipmentDay(b).localeCompare(shipmentDay(a))), [searched, status, method, from, to]);

  const filtersActive = status !== "all" || method !== ALL || !!from || !!to;
  const clear = () => { setStatus("all"); setMethod(ALL); setFrom(""); setTo(""); };
  const offline = isOfflineResponse(query.data);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v: StatusFilter) => setStatus(v)}>
          <SelectTrigger className="h-9 w-[190px]" aria-label="Filter by shipment status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Open and closed ({searched.length})</SelectItem>
            <SelectItem value="open">Open ({openCount})</SelectItem>
            <SelectItem value="closed">Closed ({searched.length - openCount})</SelectItem>
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="h-9 w-[180px]" aria-label="Filter by shipping method"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All shipping methods</SelectItem>
            {methods.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">From <Input type="date" className="h-9 w-36" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">To <Input type="date" className="h-9 w-36" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {filtersActive ? <Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button> : null}
      </div>

      {offline ? (
        <Alert role="alert"><AlertDescription>
          Live shipments aren&apos;t available right now: the lab connector is offline, or hasn&apos;t been updated to share all customers&apos; shipments yet.
        </AlertDescription></Alert>
      ) : null}
      {query.isError ? (
        <Alert variant="destructive" role="alert"><AlertDescription>
          {query.error instanceof Error ? query.error.message : "Shipments are temporarily unavailable."}
        </AlertDescription></Alert>
      ) : null}
      {query.data?.truncated ? (
        <Alert role="status"><AlertDescription>More shipments exist than can be listed here. Search or filter to narrow them down.</AlertDescription></Alert>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : query.isError && rows.length === 0 ? null : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">{all.length === 0 ? "No shipments were found." : "No shipments match."}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shipment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Customers</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => {
              const open = shipmentIsOpen(s);
              const isExpanded = expanded === s.shipment_session_id;
              const items = s.orders ?? [];
              const customers = shipmentCustomers(s);
              const trackingUrl = isSafeTrackingUrl(s.tracking_url);
              const toggle = () => setExpanded(isExpanded ? null : s.shipment_session_id);
              return (
                <Fragment key={s.shipment_session_id}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/40"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={toggle}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
                      e.preventDefault();
                      toggle();
                    }}
                  >
                    <TableCell className="font-medium">#{shipmentLabel(s)}</TableCell>
                    <TableCell><Badge variant="outline">{open ? "Open" : "Closed"}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{open ? <span className="text-muted-foreground">—</span> : formatLiveDate(s.closed_at)}</TableCell>
                    <TableCell className="text-sm">{shippingMethodLabel(s.shipping_method_name) || <span className="text-muted-foreground">Pending</span>}</TableCell>
                    <TableCell className="max-w-[220px] text-sm">
                      {customers.length === 0 ? <span className="text-muted-foreground">—</span> : (
                        <span className="block truncate" title={customers.join(", ")}>
                          {customers[0]}{customers.length > 1 ? ` +${customers.length - 1} more` : ""}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{items.length || s.item_count || 0}</TableCell>
                    <TableCell className="text-sm">
                      {s.tracking_number ? (
                        trackingUrl ? (
                          <a href={trackingUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 font-medium text-primary underline-offset-4 hover:underline">
                            {s.tracking_number} <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : s.tracking_number
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell><ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} aria-hidden="true" /></TableCell>
                  </TableRow>
                  {isExpanded ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={8} className="bg-muted/40 p-0">
                        {items.length ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="h-6 text-xs">Order</TableHead>
                                <TableHead className="h-6 text-xs">Rx</TableHead>
                                <TableHead className="h-6 text-xs">Customer</TableHead>
                                <TableHead className="h-6 text-xs">Patient / item</TableHead>
                                <TableHead className="h-6 text-right text-xs">Qty</TableHead>
                                <TableHead className="h-6 text-xs">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((item, index) => {
                                // Only open shipments are age-shaded; the shipment start stands in when an item has no date.
                                const band = open ? orderAgeBand(item.received_at ?? s.started_at) : null;
                                return (
                                  <TableRow key={`${item.order_id ?? "item"}-${item.rx_number ?? index}`} style={band ? { backgroundColor: orderAgeTint(band) } : undefined} title={band ? `Order age: ${band.label}` : undefined}>
                                    <TableCell className="font-medium">{item.order_id ?? "—"}</TableCell>
                                    <TableCell>{item.rx_number ?? "—"}</TableCell>
                                    <TableCell>{item.customer_name ?? item.account_number ?? "—"}</TableCell>
                                    <TableCell>{item.patient || item.description || "—"}</TableCell>
                                    <TableCell className="text-right">{item.quantity ?? "—"}</TableCell>
                                    <TableCell>{item.status_name ?? "—"}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <p className="px-4 py-3 text-sm text-muted-foreground">Shipment details are not available yet.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      {query.data?.retrieved_at ? (
        <p className="text-xs text-muted-foreground" role="status">Live from the lab at {formatLiveDate(query.data.retrieved_at)}. Showing open shipments and those closed in the last {SHIPMENT_WINDOW_DAYS} days.</p>
      ) : null}
    </div>
  );
}
