import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, CreditCard, Loader2, XCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

type PaymentStatus = "all" | "Successful" | "Declined" | "Error";

// Intentionally mirrors only the database projection. Gateway parameter bags,
// card metadata, tokens, and diagnostics must never cross into this page.
type PaymentActivityRow = {
  occurred_at: string;
  payment_reference: string;
  transaction_type: "statement" | "order";
  status: Exclude<PaymentStatus, "all">;
  amount: number | null;
  currency: string | null;
};

const formatAmount = (amount: number | null, currency: string | null) => {
  if (amount === null) return "—";
  const symbol = currency === "052" ? "BBD" : currency === "840" ? "USD" : currency ?? "";
  return `${symbol ? `${symbol} ` : ""}$${Number(amount).toFixed(2)}`;
};

const statusMeta: Record<Exclude<PaymentStatus, "all">, { icon: typeof CheckCircle2; className: string }> = {
  Successful: { icon: CheckCircle2, className: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  Declined: { icon: XCircle, className: "border-amber-300 bg-amber-50 text-amber-700" },
  Error: { icon: CircleAlert, className: "border-red-300 bg-red-50 text-red-700" },
};

const nextCalendarDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

export default function PaymentActivityPage() {
  const [status, setStatus] = useState<PaymentStatus>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const activityQuery = useQuery({
    queryKey: ["scotia-payment-activity", status, fromDate, toDate],
    queryFn: async () => {
      let query = (supabase as any)
        .from("scotia_payment_activity")
        .select("occurred_at,payment_reference,transaction_type,status,amount,currency")
        .order("occurred_at", { ascending: false })
        .limit(100);
      if (status !== "all") query = query.eq("status", status);
      if (fromDate) query = query.gte("occurred_at", fromDate);
      if (toDate) query = query.lt("occurred_at", nextCalendarDate(toDate));
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as PaymentActivityRow[];
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <AdminPageHeader icon={CreditCard} title="Payment Activity" />
          <p className="mt-1 text-sm text-muted-foreground">A concise confirmation of Scotia card-payment activity.</p>
        </div>
        <p className="text-xs text-muted-foreground">Most recent 100 results</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <div className="w-44 space-y-1">
            <label htmlFor="payment-activity-status" className="text-xs font-medium">Status</label>
            <Select value={status} onValueChange={(value) => setStatus(value as PaymentStatus)}>
              <SelectTrigger id="payment-activity-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Successful">Successful</SelectItem>
                <SelectItem value="Declined">Declined</SelectItem>
                <SelectItem value="Error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor="payment-activity-from" className="text-xs font-medium">From</label>
            <Input id="payment-activity-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <label htmlFor="payment-activity-to" className="text-xs font-medium">To</label>
            <Input id="payment-activity-to" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        {activityQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading payment activity…</div>
        ) : activityQuery.isError ? (
          <div className="py-16 text-center text-sm text-destructive">Payment activity could not be loaded.</div>
        ) : activityQuery.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Time</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Reference</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Type</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Amount</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activityQuery.data.map((row) => {
                  const meta = statusMeta[row.status];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={row.payment_reference} className="border-b last:border-0">
                      <td className="whitespace-nowrap px-4 py-3">{new Date(row.occurred_at).toLocaleString()}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{row.payment_reference}</td>
                      <td className="whitespace-nowrap px-4 py-3 capitalize">{row.transaction_type}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatAmount(row.amount, row.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3"><Badge variant="outline" className={`gap-1 ${meta.className}`}><StatusIcon className="h-3.5 w-3.5" />{row.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">No card-payment activity matches these filters.</div>
        )}
      </Card>
    </div>
  );
}
