import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Send, XCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functionErrors";

type LinkRow = {
  id: string;
  origin: "staff_terminal" | "assisted_link" | "email_request" | "self_serve";
  provider: string | null;
  payment_reference: string;
  customer_name: string;
  customer_email: string | null;
  amount: number;
  order_reference: string | null;
  reason: string | null;
  contact_id: string | null;
  status: "pending" | "settled" | "failed";
  needs_matching: boolean;
  created_at: string;
  link_expires_at: string | null;
  token_used_at: string | null;
  paid_at: string | null;
  /** True when this payment is an order supplementary invoice, which must stay payable. */
  isInvoice: boolean;
};

type StatusKey = "awaiting" | "started" | "expired" | "paid" | "closed";
type Filter = "unpaid" | "unopened" | "paid" | "all";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "unpaid", label: "Unpaid" },
  { key: "unopened", label: "Not opened" },
  { key: "paid", label: "Receipts" },
  { key: "all", label: "All activity" },
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "BBD" }).format(amount);
const when = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));

const statusOf = (row: LinkRow): StatusKey => {
  if (row.status === "settled") return "paid";
  if (row.status === "failed") return "closed";
  if (row.token_used_at) return "started";
  if (row.link_expires_at && new Date(row.link_expires_at).getTime() <= Date.now()) return "expired";
  return "awaiting";
};

/** Unpaid = still collectable or lapsed; cancelled/failed rows are not chased. */
const matchesFilter = (row: LinkRow, filter: Filter) => {
  const status = statusOf(row);
  if (filter === "all") return true;
  if (filter === "paid") return status === "paid";
  if (filter === "unopened") return (row.origin === "assisted_link" || row.origin === "email_request") && !row.token_used_at && (status === "awaiting" || status === "expired");
  return status === "awaiting" || status === "started" || status === "expired";
};

const STATUS_LABEL: Record<StatusKey, string> = {
  awaiting: "Not opened",
  started: "Opened, unpaid",
  expired: "Expired",
  paid: "Paid",
  closed: "Cancelled or failed",
};

const QUERY_KEY = ["walk-in-link-activity"];

/**
 * Every link and request staff have sent, with whether it has been paid.
 *
 * Link tokens are stored only as hashes, so a link can never be shown again —
 * "Resend" always issues a new link and retires the old one.
 */
const LinkActivityPanel = ({ onOpenReceipt }: { onOpenReceipt?: (id: string) => void }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [resendTarget, setResendTarget] = useState<LinkRow | null>(null);
  const [resendAmount, setResendAmount] = useState("");
  const [cancelTarget, setCancelTarget] = useState<LinkRow | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rows = [], isLoading, isFetching, refetch, error: queryError } = useQuery({
    queryKey: QUERY_KEY,
    refetchInterval: 15000,
    queryFn: async () => {
      const [payments, invoices] = await Promise.all([
        (supabase as any)
          .from("walk_in_payments")
          .select("id,origin,provider,payment_reference,customer_name,customer_email,amount,order_reference,reason,contact_id,status,needs_matching,created_at,link_expires_at,token_used_at,paid_at")
          .order("created_at", { ascending: false })
          .limit(100),
        (supabase as any).from("order_extra_invoices").select("payment_id"),
      ]);
      if (payments.error) throw payments.error;
      if (invoices.error) throw invoices.error;
      const invoicePaymentIds = new Set<string>(
        ((invoices.data ?? []) as { payment_id: string }[]).map((invoice) => invoice.payment_id),
      );
      return ((payments.data ?? []) as Omit<LinkRow, "isInvoice">[]).map((row) => ({
        ...row,
        isInvoice: invoicePaymentIds.has(row.id),
      })) as LinkRow[];
    },
  });

  // Flip rows to Paid as soon as a settlement lands; the poll above is the backstop.
  useEffect(() => {
    const channel = supabase
      .channel("walk-in-link-activity")
      .on("postgres_changes", { event: "*", schema: "public", table: "walk_in_payments" }, () => {
        void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["walk-in-payments-unmatched"] });
  };

  const openResend = (row: LinkRow) => {
    setResendAmount(String(row.amount));
    setResendTarget(row);
  };

  const resend = async () => {
    if (!resendTarget?.customer_email) return;
    const amount = Number(resendAmount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 999999.99) {
      toast({ variant: "destructive", title: "Enter a payment amount greater than zero." });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("scotia-payment", {
        body: {
          action: "send-walkin-request",
          amount,
          customerName: resendTarget.customer_name,
          customerEmail: resendTarget.customer_email,
          orderReference: resendTarget.order_reference || undefined,
          reason: resendTarget.reason || undefined,
          contactId: resendTarget.contact_id || undefined,
          replacesPaymentId: resendTarget.id,
        },
      });
      if (error || (data as { error?: string } | null)?.error) {
        throw new Error(await functionErrorMessage(error, data, "Could not resend the request."));
      }
      toast({
        title: "New payment request sent",
        description: `The old link no longer works. ${resendTarget.customer_email} has the new one.`,
      });
      setResendTarget(null);
      refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not resend",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    try {
      const { error } = await (supabase.rpc as any)("cancel_walk_in_payment", { p_payment_id: cancelTarget.id });
      if (error) throw error;
      toast({ title: "Link cancelled", description: "The customer can no longer pay with it." });
      setCancelTarget(null);
      refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not cancel",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      refresh();
    } finally {
      setBusy(false);
    }
  };

  const visible = rows.filter((row) => matchesFilter(row, filter) && `${row.customer_name} ${row.customer_email ?? ""} ${row.order_reference ?? ""} ${row.payment_reference}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card className="walk-in-register print:hidden">
      <CardHeader className="walk-in-register-header space-y-2 p-3 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Payment register</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map(({ key, label }) => {
            const count = rows.filter((row) => matchesFilter(row, key)).length;
            return (
              <Button
                key={key}
                size="sm"
                className="h-7 px-2.5 text-xs"
                aria-pressed={filter === key}
                variant={filter === key ? "default" : "outline"}
                onClick={() => setFilter(key)}
              >
                {label}{key !== "all" && key !== "paid" ? ` (${count})` : ""}
              </Button>
            );
          })}
        </div>
        <Input aria-label="Search payments" placeholder="Search customer, email or reference" value={search} onChange={(event) => setSearch(event.target.value)} className="h-8 max-w-md" />
      </CardHeader>
      <div className="walk-in-register-records" role="region" aria-label="Payment register records" tabIndex={0}>
        {queryError ? <p role="alert" className="p-4 text-sm text-destructive">Could not load payments. Refresh to try again.</p> : isLoading ? <Loader2 aria-label="Loading payments" className="m-4 h-5 w-5 animate-spin" /> : (
          <table>
            <thead><tr>{["Customer", "Email", "Order / reference", "Amount (BBD)", "Method", "Status", "Created", "Expires", "Paid", "Matching", "Reason", "Payment reference", "Actions"].map(title => <th key={title} scope="col">{title}</th>)}</tr></thead>
            <tbody>{visible.map(row => {
              const status = statusOf(row);
              const isLink = row.origin === "assisted_link" || row.origin === "email_request";
              const live = isLink && row.status === "pending" && !row.token_used_at && !row.isInvoice;
              const canResend = live && row.origin === "email_request" && Boolean(row.customer_email);
              const canCancel = live && status === "awaiting";
              const method = row.provider === "cash" ? "Cash" : row.origin === "email_request" ? "Email request" : row.origin === "assisted_link" ? "Counter link" : row.origin === "self_serve" ? "Self-service card" : "Card";
              const statusLabel = !isLink && status === "awaiting" ? "Pending" : STATUS_LABEL[status];
              const matching = row.status !== "settled" ? "—" : row.needs_matching ? "Needs matching" : row.order_reference || row.contact_id ? "Reconciled" : "Unassigned";
              return <tr key={row.id}>
                <th scope="row" className="register-text" title={row.customer_name}>{row.customer_name}</th>
                <td className="register-text" title={row.customer_email ?? ""}>{row.customer_email || "—"}</td>
                <td>{row.order_reference || "—"}</td>
                <td className="font-medium tabular-nums">{money(Number(row.amount))}</td>
                <td>{row.isInvoice ? `${method} (invoice)` : method}</td>
                <td><Badge className="px-1.5 py-0 text-[11px]" variant={status === "paid" ? "default" : "outline"}>{statusLabel}</Badge></td>
                <td>{when(row.created_at)}</td><td>{row.link_expires_at ? when(row.link_expires_at) : "—"}</td><td>{row.paid_at ? when(row.paid_at) : "—"}</td>
                <td className={row.needs_matching ? "text-destructive" : "text-muted-foreground"}>{matching}</td>
                <td className="register-text" title={row.reason ?? ""}>{row.reason || "—"}</td>
                <td>{row.payment_reference}</td>
                <td><div className="flex gap-1">
                  {status === "paid" && onOpenReceipt ? <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onOpenReceipt(row.id)}>Receipt</Button> : null}
                  {canResend ? <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => openResend(row)}>Resend</Button> : null}
                  {canCancel ? <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setCancelTarget(row)}>Cancel</Button> : null}
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        )}
        {!isLoading && !queryError && !visible.length ? <p className="p-4 text-center text-sm text-muted-foreground">No payments match this view.</p> : null}
      </div>
      <div className="walk-in-register-footer">{visible.length} of {rows.length} loaded payments · Latest 100 records · Payment status is independent of email delivery.</div>

      <AlertDialog open={Boolean(resendTarget)} onOpenChange={(open) => { if (!open && !busy) setResendTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend payment request</AlertDialogTitle>
            <AlertDialogDescription>
              Emails {resendTarget?.customer_name} ({resendTarget?.customer_email}) a new link. The old link stops working straight away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="grid gap-1.5 text-sm font-medium">
            Amount (BBD)
            <Input
              inputMode="decimal"
              type="number"
              min="0.01"
              max="999999.99"
              step="0.01"
              value={resendAmount}
              onChange={(event) => setResendAmount(event.target.value)}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void resend();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send new link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open && !busy) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this link?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelTarget ? `${money(Number(cancelTarget.amount))} for ${cancelTarget.customer_name}. ` : ""}
              The customer will no longer be able to pay with it. This cannot be undone; send a new request if they still need to pay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                void cancel();
              }}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cancel link
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default LinkActivityPanel;
