import { useRxSubmissions } from "@/features/rx-order/hooks/useRxSubmissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Ban, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// Innovations submission outbox (manual-release gate). Paid/confirmed Rx
// orders land here as pending_review; approving releases them to the office
// worker (optilens-local), which submits via InnovaAPI /process_rxi or the
// file-drop and reports the lab's result back onto the row.

const STATUS_STYLES: Record<string, string> = {
  pending_review: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300",
  approved: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  claimed: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300",
  submitted: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const RxSubmissionsPage = () => {
  const { data: rows = [], isLoading, approveMutation, cancelMutation } = useRxSubmissions();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Send className="h-4 w-4" /> Innovations Submissions
        </h1>
        <Badge variant="outline" className="text-[10px]">
          {rows.filter((r) => r.status === "pending_review").length} awaiting release
        </Badge>
      </div>

      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Quote</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Customer</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Lab result</th>
              <th className="text-right px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Created</th>
              <th className="w-[170px]" />
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="text-center text-xs text-muted-foreground py-6">Loading…</td></tr>}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={6} className="text-center text-xs text-muted-foreground py-8">
                Nothing here yet — Rx orders appear once their cart order is paid or confirmed.
              </td></tr>
            )}
            {rows.map((r) => {
              const q: any = (r.payload as any)?.quote ?? {};
              const acct: any = (r.payload as any)?.account ?? {};
              return (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30 align-top">
                  <td className="px-2 py-1.5 font-mono">{q.quote_number ?? r.quote_id.slice(0, 8)}</td>
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{q.customer_name ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{acct.name}{acct.account_number ? ` · ${acct.account_number}` : ""}</div>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge variant="outline" className={cn("text-[9px]", STATUS_STYLES[r.status] ?? "")}>{r.status.replace("_", " ")}</Badge>
                    {r.transport && <div className="text-[9px] text-muted-foreground mt-0.5">{r.transport === "api" ? "InnovaAPI" : "file drop"}</div>}
                  </td>
                  <td className="px-2 py-1.5 max-w-[260px]">
                    {r.result_message && <div className="truncate" title={r.result_message}>[{r.result_code}] {r.result_message}</div>}
                    {r.last_error && <div className="text-red-600 dark:text-red-400 truncate" title={r.last_error}>{r.last_error}</div>}
                    {!r.result_message && !r.last_error && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-muted-foreground whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {(r.status === "pending_review" || r.status === "failed") && (
                      <Button size="sm" className="h-6 text-[10px] px-2 gap-1" disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(r.id)}>
                        {r.status === "failed" ? <><RotateCcw className="h-3 w-3" /> Retry</> : <><Send className="h-3 w-3" /> Release</>}
                      </Button>
                    )}
                    {["pending_review", "approved", "failed"].includes(r.status) && (
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1 text-muted-foreground" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(r.id)}>
                        <Ban className="h-3 w-3" /> Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground max-w-3xl">
        "Release" refreshes the payload snapshot and hands the order to the office service; the office polls every few
        minutes, generates the RXI, and submits over the API (file-drop as fallback). Results and the returned RXT are
        recorded here for audit.
      </p>
    </div>
  );
};

export default RxSubmissionsPage;
