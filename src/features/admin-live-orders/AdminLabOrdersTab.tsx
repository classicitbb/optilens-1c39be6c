// "Active Rx" on /admin/orders: every customer's orders currently at the lab, the
// same live feed and table the customer profile shows under "Order status".
import { useMemo, useState } from "react";
import { Link } from "react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { ExternalLink, Loader2, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_AGE_BANDS, orderAgeBand, orderAgeTint } from "@/lib/orderAge";
import { formatLiveDate, isOfflineResponse, labOrderMatches, type AllLabOrdersResponse, type LabOrder } from "./liveOrders";

const ALL = "all";
const PAGE_SIZE = 50;
const NO_ORDERS: LabOrder[] = [];

interface Props {
  query: UseQueryResult<AllLabOrdersResponse>;
  search: string;
}

export default function AdminLabOrdersTab({ query, search }: Props) {
  const [status, setStatus] = useState(ALL);
  const [age, setAge] = useState(ALL);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const all = query.data?.orders ?? NO_ORDERS;
  const searched = useMemo(() => all.filter((o) => labOrderMatches(o, search)), [all, search]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of searched) counts.set(o.status_name ?? "—", (counts.get(o.status_name ?? "—") ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [searched]);

  const rows = useMemo(() => searched.filter((o) => {
    if (status !== ALL && (o.status_name ?? "—") !== status) return false;
    if (age !== ALL && orderAgeBand(o.received_at)?.label !== age) return false;
    return true;
  }), [searched, status, age]);

  const filtersActive = status !== ALL || age !== ALL;
  const offline = isOfflineResponse(query.data);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => { setStatus(v); setVisible(PAGE_SIZE); }}>
          <SelectTrigger className="h-9 w-[220px]" aria-label="Filter by lab status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All lab statuses ({searched.length})</SelectItem>
            {statusCounts.map(([name, count]) => <SelectItem key={name} value={name}>{name} ({count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={age} onValueChange={(v) => { setAge(v); setVisible(PAGE_SIZE); }}>
          <SelectTrigger className="h-9 w-[170px]" aria-label="Filter by order age"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any order age</SelectItem>
            {ORDER_AGE_BANDS.map((band) => <SelectItem key={band.label} value={band.label}>{band.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {filtersActive ? <Button size="sm" variant="ghost" onClick={() => { setStatus(ALL); setAge(ALL); }}>Clear filters</Button> : null}
        <Button asChild size="sm" variant="outline" className="ml-auto gap-1">
          <Link to="/admin/orders/rx"><ExternalLink className="h-3.5 w-3.5" />Rx workspace</Link>
        </Button>
      </div>

      {offline ? (
        <Alert role="alert"><AlertDescription>
          Live lab status isn&apos;t available right now: the lab connector is offline, or hasn&apos;t been updated to share all customers&apos; orders yet.
        </AlertDescription></Alert>
      ) : null}
      {query.isError ? (
        <Alert variant="destructive" role="alert"><AlertDescription>
          {query.error instanceof Error ? query.error.message : "Active lab orders are temporarily unavailable."}
        </AlertDescription></Alert>
      ) : null}
      {query.data?.truncated ? (
        <Alert role="status"><AlertDescription>The lab returned more orders than can be listed here. Search or filter to narrow them down.</AlertDescription></Alert>
      ) : null}

      {query.isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : query.isError && rows.length === 0 ? null : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">{all.length === 0 ? "No active lab orders were found." : "No active lab orders match."}</p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rx Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Promise Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, visible).map((order, index) => {
                const band = orderAgeBand(order.received_at);
                return (
                  <TableRow
                    key={`${order.order_id ?? order.rx_number ?? "order"}-${order.account_number ?? ""}-${index}`}
                    style={band ? { backgroundColor: orderAgeTint(band) } : undefined}
                    title={band ? `Order age: ${band.label}` : undefined}
                  >
                    <TableCell className="font-medium">{order.rx_number ?? "—"}</TableCell>
                    <TableCell>
                      <p className="font-medium leading-tight">{order.customer_name ?? order.account_number ?? "—"}</p>
                      {order.customer_name && order.account_number ? <p className="text-xs text-muted-foreground">{order.account_number}</p> : null}
                    </TableCell>
                    <TableCell>{order.patient ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatLiveDate(order.received_at)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatLiveDate(order.promise_date)}</TableCell>
                    <TableCell><Badge variant="outline">{order.status_name ?? "—"}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Order age colour key">
            <span>Order age:</span>
            {ORDER_AGE_BANDS.map((band) => (
              <span key={band.label} className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: orderAgeTint(band, 0.6) }} aria-hidden="true" />
                {band.label}
              </span>
            ))}
          </div>
          {rows.length > visible ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Showing {visible} of {rows.length} orders.</p>
              <Button variant="outline" size="sm" onClick={() => setVisible((n) => n + PAGE_SIZE)}>Load more</Button>
            </div>
          ) : null}
        </>
      )}

      {query.data?.retrieved_at ? (
        <p className="text-xs text-muted-foreground" role="status">Live from the lab at {formatLiveDate(query.data.retrieved_at)}.</p>
      ) : null}
    </div>
  );
}
