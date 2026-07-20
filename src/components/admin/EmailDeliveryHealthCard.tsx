import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2, MailWarning, RefreshCw } from "lucide-react";

// Reads the shared email_send_log audit trail (via docstudio-api, since that
// table is service-role-only) to answer "is support@classicvisions.net
// actually delivering mail?" — the same pipeline used by Doc Studio's email
// tool, contact-inquiry, and every transactional template.

type LogRow = {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

type HealthResponse = {
  status: "healthy" | "degraded" | "blocked" | "no_data";
  message: string;
  sender: string;
  lastSentAt: string | null;
  latestAttempt: LogRow | null;
  counts24h: Record<string, number>;
  rateLimitedUntil: string | null;
  recent: LogRow[];
};

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");

const STATUS_META: Record<HealthResponse["status"], { label: string; className: string; icon: typeof CheckCircle2 }> = {
  healthy: { label: "Sending", className: "bg-emerald-500/10 text-emerald-700 border-emerald-300", icon: CheckCircle2 },
  degraded: { label: "Attention needed", className: "bg-amber-500/10 text-amber-700 border-amber-300", icon: AlertTriangle },
  blocked: { label: "Paused", className: "bg-red-500/10 text-red-700 border-red-300", icon: MailWarning },
  no_data: { label: "No recent activity", className: "bg-slate-500/10 text-slate-700 border-slate-300", icon: HelpCircle },
};

export default function EmailDeliveryHealthCard() {
  const { toast } = useToast();

  const { data, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ["email-delivery-health"],
    refetchInterval: 120000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("docstudio-api/email/health", { method: "GET" });
      if (error) throw error;
      return data as HealthResponse;
    },
  });

  const recheck = async () => {
    const result = await refetch();
    if (result.error) {
      toast({ title: "Could not refresh status", description: (result.error as Error).message, variant: "destructive" });
      return;
    }
    toast({ title: "Email status refreshed", description: result.data?.message ?? "Done." });
  };

  const meta = data ? STATUS_META[data.status] : STATUS_META.no_data;
  const StatusIcon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <StatusIcon className="h-4 w-4" /> Email delivery status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
            <Button variant="outline" size="sm" onClick={() => void recheck()} disabled={isLoading || isRefetching}>
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Recheck
            </Button>
          </div>
        </div>
        <CardDescription>
          Live status for outbound mail from {data?.sender ?? "support@classicvisions.net"} — shared by Doc Studio's email tool, contact forms, and every transactional email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking delivery status…
          </div>
        ) : error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-amber-700">
            <span>Could not read delivery status. Try again in a moment.</span>
            <Button variant="outline" size="sm" onClick={() => void recheck()} disabled={isRefetching}>
              {isRefetching && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Retry
            </Button>
          </div>
        ) : (
          <>
            <p className={data?.status === "degraded" || data?.status === "blocked" ? "font-medium text-amber-800" : "text-foreground"}>
              {data?.message}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <p className="text-lg font-semibold text-emerald-700">{data?.counts24h.sent ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Sent (24h)</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <p className="text-lg font-semibold">{data?.counts24h.pending ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Pending (24h)</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <p className={`text-lg font-semibold ${(data?.counts24h.failed ?? 0) + (data?.counts24h.dlq ?? 0) > 0 ? "text-red-600" : ""}`}>
                  {(data?.counts24h.failed ?? 0) + (data?.counts24h.dlq ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">Failed (24h)</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-2 text-center">
                <p className="text-lg font-semibold">{data?.counts24h.suppressed ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Suppressed (24h)</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Last confirmed send: <strong>{fmt(data?.lastSentAt)}</strong></p>

            {!!data?.recent.length && (
              <div className="rounded-md border">
                <table className="w-full text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Recipient</th>
                      <th className="px-3 py-2 font-medium">Source</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.slice(0, 8).map((row) => (
                      <tr key={`${row.message_id ?? row.created_at}-${row.recipient_email}`} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap">{fmt(row.created_at)}</td>
                        <td className="px-3 py-2">{row.recipient_email}</td>
                        <td className="px-3 py-2">{row.template_name}</td>
                        <td className={`px-3 py-2 capitalize ${["failed", "dlq", "bounced", "complained"].includes(row.status) ? "text-red-600 font-semibold" : row.status === "sent" ? "text-emerald-700" : ""}`}>
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
