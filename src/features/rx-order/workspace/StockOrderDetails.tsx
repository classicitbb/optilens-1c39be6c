import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useStockOrderPreview } from "@/hooks/useStockOrderBuilder";
import type { StockSubmissionRow } from "./stockSubmissions";

interface DispatchEvidence {
  id: string;
  success: boolean;
  http_status: number | null;
  created_at: string;
  request_snapshot: { environment?: string; rx_content?: string } | null;
  response_snapshot: unknown;
}

const Json = ({ value }: { value: unknown }) => <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-all bg-muted p-3 text-[11px]">{JSON.stringify(value, null, 2)}</pre>;
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function StockOrderDetails({ stock, view }: { stock: StockSubmissionRow; view: "summary" | "payload" | "lab" | "timeline" }) {
  const [renderFile, setRenderFile] = useState(false);
  const evidence = useQuery<DispatchEvidence[]>({
    queryKey: ["stock-dispatch-evidence", stock.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("gatekeeper_dispatch_logs")
        .select("id,success,http_status,created_at,request_snapshot,response_snapshot")
        .eq("submission_id", stock.id).eq("order_kind", "stock").eq("phase", "push_order_to_lab")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const sent = evidence.data?.find((e) => e.success);
  const savedFile = sent?.request_snapshot?.rx_content;
  const preview = useStockOrderPreview(stock.id, renderFile && !savedFile);
  const file = savedFile ?? preview.data?.hashref;
  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(new Blob([file], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = stock.filename ?? `stock-${stock.order_id ?? stock.id}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (view === "summary") return (
    <div className="space-y-3 text-xs">
      <dl className="grid grid-cols-[100px_1fr] gap-2">
        <dt className="text-muted-foreground">Reference</dt><dd>{stock.order_reference ?? "—"}</dd>
        <dt className="text-muted-foreground">PO number</dt><dd>{stock.po_number ?? "—"}</dd>
        <dt className="text-muted-foreground">Instructions</dt><dd className="whitespace-pre-wrap break-words">{stock.payload.instructions ?? "—"}</dd>
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted"><tr>{["Item / SKU", "Eye", "Qty", "Unit BBD", "Total BBD"].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
          <tbody>{(stock.payload.items ?? []).map((l, idx) => (
            <tr key={idx} className="border-b border-border">
              <td className="p-2">{l.description ?? l.product_id ?? "Item"}<div className="font-mono text-muted-foreground">{l.sku ?? "—"}</div>{l.comment && <div>{l.comment}</div>}</td>
              <td className="p-2">{l.side ?? "—"}</td><td className="p-2">{l.quantity ?? "—"}</td>
              <td className="p-2">{l.unit_price == null ? "—" : money(l.unit_price)}</td>
              <td className="p-2">{l.unit_price == null || l.quantity == null ? "—" : money(l.unit_price * l.quantity)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr className="font-semibold"><td colSpan={4} className="p-2">Total BBD</td><td className="p-2">{stock.payload.order_total == null ? "—" : money(stock.payload.order_total)}</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
  if (view === "payload") return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold">{savedFile ? "Saved transmitted file" : "Order file"}</h3>
      {savedFile?.includes("[truncated]") && <p className="text-xs text-destructive">The stored transmission snapshot is truncated; it is not the complete file.</p>}
      {!savedFile && <p className="text-xs text-muted-foreground">No transmitted file snapshot is available. A regenerated preview is not proof of delivery.</p>}
      {!savedFile && !renderFile && <Button size="sm" variant="outline" onClick={() => setRenderFile(true)}><FileText className="mr-1 h-4 w-4" />Render preview file</Button>}
      {preview.isFetching && <p className="text-xs">Rendering…</p>}
      {preview.error && <p className="text-xs text-destructive">{preview.error.message}</p>}
      {file && <><Button size="sm" variant="outline" onClick={download}><Download className="mr-1 h-4 w-4" />Download file</Button><pre className="max-h-[55vh] overflow-auto bg-muted p-3 text-[11px]">{file}</pre></>}
      <details><summary className="cursor-pointer text-xs font-semibold">Full saved order</summary><Json value={stock.payload} /></details>
      {evidence.error && <p className="text-xs text-destructive">Could not load transmission evidence: {evidence.error.message}</p>}
    </div>
  );
  if (view === "lab") return (
    <div className="space-y-3 text-xs">
      <dl className="grid grid-cols-[110px_1fr] gap-2">
        <dt className="text-muted-foreground">Sender</dt><dd>{stock.dispatch_provider === "gatekeeper" ? "Gatekeeper" : "OptiLens / Innovations"}</dd>
        <dt className="text-muted-foreground">Environment</dt><dd>{sent?.request_snapshot?.environment ?? "Not recorded"}</dd>
        <dt className="text-muted-foreground">Order number</dt><dd>{stock.gatekeeper_order_id ?? "—"}</dd>
        <dt className="text-muted-foreground">Transport</dt><dd>{stock.transport ?? "—"}</dd>
        <dt className="text-muted-foreground">HTTP response</dt><dd>{sent?.http_status ?? "No successful response recorded"}</dd>
        <dt className="text-muted-foreground">Accepted at</dt><dd>{sent ? new Date(sent.created_at).toLocaleString() : "—"}</dd>
        <dt className="text-muted-foreground">Lab status</dt><dd>{stock.lab_status ?? "No receiving-lab confirmation recorded"}</dd>
      </dl>
      {sent && <p className="text-muted-foreground">Gatekeeper accepted this transmission. This does not confirm import into the receiving lab software.</p>}
      {stock.last_error && <p className="text-destructive">{stock.last_error}</p>}
      <h3 className="font-semibold">Saved receipt</h3><Json value={stock.receipt ?? null} />
      {sent && <><h3 className="font-semibold">Gatekeeper response</h3><Json value={sent.response_snapshot} /></>}
      {evidence.error && <p className="text-destructive">Could not load transmission evidence: {evidence.error.message}</p>}
    </div>
  );
  return <ol className="space-y-2 text-xs"><li>{new Date(stock.created_at).toLocaleString()} · Saved</li>{stock.released_at && <li>{new Date(stock.released_at).toLocaleString()} · Released</li>}{evidence.data?.map((e) => <li key={e.id}>{new Date(e.created_at).toLocaleString()} · Gatekeeper HTTP {e.http_status} · {e.success ? "Accepted" : "Failed"}</li>)}</ol>;
}