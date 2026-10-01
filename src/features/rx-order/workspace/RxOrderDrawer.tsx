// The detail drawer: what the order is, what it will cost, what was sent to the lab
// and what came back, and everything that has happened to it. For a capture it also
// shows the original sheet beside the order.
import { useMemo, type ReactNode } from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { canonicalOrderFromRxSubmission } from "../../../../supabase/functions/_shared/orders/hashref";
import { savedRxPayload } from "../embed/rx-order-adapter";
import { upgradeV1, type RxOrderV2 } from "../domain/schema";
import { SOURCE_LABELS, statusLabel, type WorkspaceItem } from "./classify";
import { useCaptureImage, useRxOrderDetail } from "./useRxWorkspace";

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const sg = (n: number | null | undefined) => (n == null ? "—" : `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}`);

const Json = ({ value }: { value: unknown }) => (
  <pre className="max-h-[55vh] overflow-auto rounded-md bg-muted p-3 text-[11px]">{JSON.stringify(value, null, 2)}</pre>
);
const Row = ({ k, children }: { k: string; children: ReactNode }) => (
  <div className="grid grid-cols-[110px_1fr] gap-2 text-xs"><dt className="text-muted-foreground">{k}</dt><dd>{children || "—"}</dd></div>
);

export function RxOrderDrawer({ item, onClose, actions }: { item: WorkspaceItem | null; onClose: () => void; actions: ReactNode }) {
  const { data: detail } = useRxOrderDetail(item?.quoteId ?? null);
  const imagePath = item?.capture?.storage_path ?? null;
  const { data: imageUrl } = useCaptureImage(imagePath);

  const order = useMemo<RxOrderV2 | null>(() => {
    const saved = savedRxPayload(detail?.quote);
    if (!saved) return null;
    try { return upgradeV1(saved); } catch { return null; }
  }, [detail?.quote]);

  const canonical = useMemo(() => {
    if (!item?.submission) return null;
    try { return canonicalOrderFromRxSubmission(item.submission); } catch (e) { return { error: e instanceof Error ? e.message : "Could not build the lab order" }; }
  }, [item?.submission]);

  const s = item?.submission;
  const total = (detail?.lines ?? []).reduce((n, l) => n + l.qty * l.unit_sell_price_bbd, 0);

  return (
    <Sheet open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {item && (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
                <span className="font-mono">{item.quoteNumber ?? "Capture"}</span>
                <Badge variant="outline" className="text-[10px]">{statusLabel(item.status)}</Badge>
                <Badge variant="secondary" className="text-[10px]">{SOURCE_LABELS[item.source]}</Badge>
              </SheetTitle>
              <SheetDescription>{item.accountName} · {when(item.createdAt)}</SheetDescription>
            </SheetHeader>

            <div className="my-3 flex flex-wrap items-center gap-2">{actions}</div>

            <Tabs defaultValue="summary">
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="payload">Payload</TabsTrigger>
                <TabsTrigger value="lab">Lab</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-4">
                {imagePath && (
                  <div className="overflow-auto rounded-lg border bg-muted/30">
                    {!imageUrl ? <p className="p-4 text-xs text-muted-foreground">Loading the original…</p>
                      : item.capture?.file_name?.toLowerCase().endsWith(".pdf") ? <iframe title="Original" src={imageUrl} className="h-[50vh] w-full" />
                      : <img src={imageUrl} alt="The captured sheet" className="max-h-[50vh] w-full object-contain" />}
                  </div>
                )}
                {item.capture?.error && <p className="text-xs text-destructive">{item.capture.error}</p>}
                {order ? (
                  <>
                    <dl className="space-y-1.5">
                      <Row k="Patient">{`${order.patient.first} ${order.patient.last}`.trim()}</Row>
                      <Row k="Reference">{order.reference}</Row>
                      <Row k="Job">{`${order.job.scope} · ${order.job.eyes === "pair" ? "pair" : order.job.eyes.toUpperCase()} · ${order.job.vision === "mf" ? "multifocal" : "single vision"}`}</Row>
                      <Row k="Frame">{[order.frame.name, order.frame.mount, order.frame.a && `A ${order.frame.a}`, order.frame.b && `B ${order.frame.b}`, order.frame.dbl && `DBL ${order.frame.dbl}`].filter(Boolean).join(" · ")}</Row>
                      <Row k="Service">{`${order.delivery.service === "pri" ? "Priority" : "Standard"} · ${order.delivery.method}`}</Row>
                      <Row k="Notes">{order.delivery.notes}</Row>
                    </dl>
                    <table className="w-full border-collapse text-center text-xs">
                      <thead><tr className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                        {["Eye", "Sphere", "Cyl", "Axis", "Add", "PD", "Height"].map((h) => <th key={h} className="px-2 py-1">{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {(["od", "os"] as const).map((e) => order.rx[e] && (
                          <tr key={e} className="border-t">
                            <th className="px-2 py-1 text-left">{e.toUpperCase()}</th>
                            <td>{sg(order.rx[e]?.sph)}</td><td>{sg(order.rx[e]?.cyl)}</td><td>{order.rx[e]?.axis ?? "—"}</td>
                            <td>{sg(order.rx[e]?.add)}</td><td>{order.rx[e]?.pd ?? "—"}</td><td>{order.rx[e]?.height ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : <p className="text-xs text-muted-foreground">{item.kind === "capture" && !item.quoteId ? "Not opened yet — open it to review what was read." : "No order details saved."}</p>}

                {!!detail?.lines.length && (
                  <div>
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Price lines</p>
                    <table className="w-full text-xs">
                      <tbody>
                        {detail.lines.map((l) => (
                          <tr key={l.id} className="border-t">
                            <td className="py-1">{l.item_name}<span className="ml-1 text-[10px] text-muted-foreground">{l.line_type}</span></td>
                            <td className="text-right tabular-nums">{l.qty > 1 ? `${l.qty} × ` : ""}{money(l.unit_sell_price_bbd)}</td>
                          </tr>
                        ))}
                        <tr className="border-t font-semibold"><td className="py-1">Total</td><td className="text-right tabular-nums">BBD {money(total)}</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {item.quoteId && (
                  <Link to={`/admin/orders/quotations/${item.quoteId}`} className="inline-flex items-center gap-1 text-xs underline">
                    <ExternalLink className="h-3 w-3" /> Open the quote
                  </Link>
                )}
              </TabsContent>

              <TabsContent value="payload" className="space-y-3">
                <p className="text-[11px] text-muted-foreground">What the form saved (cv.rxorder/2), what is sent to the lab, and the lab order built from it.</p>
                <details open><summary className="cursor-pointer text-xs font-semibold">Order (cv.rxorder/2)</summary>{order ? <Json value={order} /> : <p className="py-2 text-xs text-muted-foreground">Nothing saved yet.</p>}</details>
                {canonical && <details><summary className="cursor-pointer text-xs font-semibold">Canonical lab order</summary><Json value={canonical} /></details>}
                {s && <details><summary className="cursor-pointer text-xs font-semibold">Submission payload</summary><Json value={s.payload} /></details>}
                {item.capture && <details><summary className="cursor-pointer text-xs font-semibold">Capture job</summary><Json value={item.capture} /></details>}
              </TabsContent>

              <TabsContent value="lab" className="space-y-2">
                {s ? (
                  <dl className="space-y-1.5">
                    <Row k="Sent to">{s.dispatch_provider === "gatekeeper" ? "Gatekeeper" : "OptiLens / Innovations"}</Row>
                    <Row k="Transport">{s.transport === "api" ? "InnovaAPI" : s.transport === "gatekeeper" ? "Gatekeeper receipt" : s.transport === "file" ? "File drop" : s.transport ?? ""}</Row>
                    <Row k="Attempts">{String(s.attempts)}</Row>
                    <Row k="Result">{s.result_message ? `[${s.result_code}] ${s.result_message}` : ""}</Row>
                    <Row k="Error">{s.last_error ? <span className="text-destructive">{s.last_error}</span> : ""}</Row>
                    <Row k="Lab status">{s.lab_status ? `${s.lab_status}${s.lab_status_detail ? ` · ${s.lab_status_detail}` : ""}${s.lab_status_at ? ` · ${when(s.lab_status_at)}` : ""}` : ""}</Row>
                    <Row k="Gatekeeper id">{s.gatekeeper_order_id ? String(s.gatekeeper_order_id) : ""}</Row>
                    {s.rxt_data && <details><summary className="cursor-pointer text-xs font-semibold">Lab response data</summary><pre className="max-h-[40vh] overflow-auto rounded-md bg-muted p-3 text-[11px]">{s.rxt_data}</pre></details>}
                  </dl>
                ) : <p className="text-xs text-muted-foreground">Not released yet — nothing has gone to the lab.</p>}
              </TabsContent>

              <TabsContent value="timeline">
                <ol className="space-y-2 text-xs">
                  {item.capture && <li><b>{when(item.capture.created_at)}</b> · captured ({SOURCE_LABELS[item.source].toLowerCase()})</li>}
                  {(detail?.events ?? []).map((e) => (
                    <li key={e.id}>
                      <b>{when(e.created_at)}</b> · {statusLabel(e.event)}
                      {e.to_status ? <span className="text-muted-foreground"> {e.from_status ? `${statusLabel(e.from_status)} → ` : "→ "}{statusLabel(e.to_status)}</span> : null}
                      {typeof e.detail?.error === "string" && <span className="block text-destructive">{e.detail.error}</span>}
                    </li>
                  ))}
                  {s?.lab_status && <li><b>{s.lab_status_at ? when(s.lab_status_at) : ""}</b> · lab: {s.lab_status}</li>}
                  {!item.capture && !(detail?.events ?? []).length && <li className="text-muted-foreground">No events recorded yet.</li>}
                </ol>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
