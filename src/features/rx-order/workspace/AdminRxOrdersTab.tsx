// The Active Rx / Shipped Rx tabs of /admin/orders: every customer's Rx and stock
// orders, read-only, with search and filters. Actions (release, retry, cancel) stay in
// the Rx workspace; the drawer links there.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ExternalLink, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { rxBucket, rxItemMatches, SOURCE_LABELS, statusLabel, TABS, type RxBucket, type WorkspaceItem, type WorkspaceTab } from "./classify";
import { RxOrderDrawer } from "./RxOrderDrawer";

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
const ALL = "all";

type ShippedFilter = "shipped" | "cancelled" | "all";

interface Props {
  mode: Exclude<RxBucket, "cancelled">;
  /** Every Rx / stock item, already narrowed by the page's search box. */
  items: readonly WorkspaceItem[];
  loading: boolean;
  error?: Error | null;
}

export default function AdminRxOrdersTab({ mode, items, loading, error }: Props) {
  const [stage, setStage] = useState<string>(ALL);
  const [shippedFilter, setShippedFilter] = useState<ShippedFilter>("shipped");
  const [orderType, setOrderType] = useState<"all" | "rx" | "stock">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const scoped = useMemo(() => items.filter((i) => {
    const bucket = rxBucket(i);
    return mode === "active" ? bucket === "active" : shippedFilter === "all" ? bucket !== "active" : bucket === shippedFilter;
  }), [items, mode, shippedFilter]);

  const stageCounts = useMemo(() => {
    const counts = new Map<WorkspaceTab, number>();
    for (const i of scoped) counts.set(i.tab, (counts.get(i.tab) ?? 0) + 1);
    return counts;
  }, [scoped]);

  const rows = useMemo(() => scoped.filter((i) => {
    if (mode === "active" && stage !== ALL && i.tab !== stage) return false;
    if (orderType === "stock" && i.kind !== "stock") return false;
    if (orderType === "rx" && i.kind === "stock") return false;
    const day = i.createdAt.slice(0, 10);
    if (from && day < from) return false;
    if (to && day > to) return false;
    return true;
  }), [scoped, mode, stage, orderType, from, to]);

  const open = items.find((i) => i.key === openKey) ?? null;
  const filtersActive = stage !== ALL || orderType !== "all" || !!from || !!to;
  const clear = () => { setStage(ALL); setOrderType("all"); setFrom(""); setTo(""); };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {mode === "active" ? (
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-[190px]" aria-label="Filter by stage"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All stages ({scoped.length})</SelectItem>
              {TABS.filter((t) => t.id !== "done").map((t) => <SelectItem key={t.id} value={t.id}>{t.label} ({stageCounts.get(t.id) ?? 0})</SelectItem>)}
            </SelectContent>
          </Select>
        ) : (
          <Select value={shippedFilter} onValueChange={(v: ShippedFilter) => setShippedFilter(v)}>
            <SelectTrigger className="h-9 w-[190px]" aria-label="Filter by outcome"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shipped">Shipped / delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="all">Shipped and cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={orderType} onValueChange={(v: "all" | "rx" | "stock") => setOrderType(v)}>
          <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by order type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Rx & Stock</SelectItem>
            <SelectItem value="rx">Rx only</SelectItem>
            <SelectItem value="stock">Stock only</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">From <Input type="date" className="h-9 w-36" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">To <Input type="date" className="h-9 w-36" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {filtersActive ? <Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button> : null}
        <Button asChild size="sm" variant="outline" className="ml-auto gap-1">
          <Link to="/admin/orders/rx"><ExternalLink className="h-3.5 w-3.5" />Rx workspace</Link>
        </Button>
      </div>

      {error ? <p role="alert" className="text-xs text-destructive">Could not load all Rx orders: {error.message}</p> : null}

      {loading && items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Package className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">{mode === "active" ? "No active Rx orders match." : "No shipped Rx orders match."}</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>{mode === "active" ? "Stage" : "Outcome"}</TableHead>
              <TableHead>Lab status</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((i) => {
              const s = i.submission ?? i.stock;
              return (
                <TableRow key={i.key} className="cursor-pointer hover:bg-muted/40" onClick={() => setOpenKey(i.key)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium">{i.quoteNumber ?? (i.kind === "capture" ? "Capture" : "—")}</span>
                      <Badge variant="secondary" className="text-[9px]">{i.stock ? "Stock" : "Rx"}</Badge>
                    </div>
                    {i.stock?.order_reference ? <div className="text-xs text-muted-foreground">{i.stock.order_reference}</div> : null}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium leading-tight">{i.patientName ?? i.accountName}</p>
                    {i.patientName ? <p className="text-xs text-muted-foreground">{i.accountName}</p> : null}
                  </TableCell>
                  <TableCell className="text-sm">{SOURCE_LABELS[i.source]}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", i.tab === "problems" && "border-red-300 text-red-600", i.status === "cancelled" && "text-muted-foreground")}>
                      {mode === "active" ? TABS.find((t) => t.id === i.tab)?.label : i.status === "cancelled" ? "Cancelled" : "Shipped"}
                    </Badge>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{statusLabel(i.status)}</div>
                  </TableCell>
                  <TableCell className="max-w-[240px] text-xs">
                    {s?.last_error && i.tab === "problems" ? <div className="truncate text-red-600" title={s.last_error}>{s.last_error}</div> : null}
                    {s?.lab_status ? <span className="font-medium">{s.lab_status}{s.lab_status_detail ? ` · ${s.lab_status_detail}` : ""}</span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">{when(i.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <RxOrderDrawer
        item={open}
        onClose={() => setOpenKey(null)}
        actions={<Button asChild size="sm" variant="outline" className="h-7 gap-1 px-2 text-[11px]"><Link to="/admin/orders/rx">Open in Rx workspace to act on it</Link></Button>}
      />
    </div>
  );
}
