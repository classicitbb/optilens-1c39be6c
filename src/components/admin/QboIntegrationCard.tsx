import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type QboState = { status: string; company_name: string | null; realm_id_masked: string | null; connected_at: string | null; last_refresh_at: string | null; last_reconciliation_status: string | null; last_reconciliation_at: string | null; last_error_message_sanitized: string | null };
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

export function QboIntegrationCard() {
  const { toast } = useToast(); const queryClient = useQueryClient();
  const state = useQuery({ queryKey: ["qbo-integration-state"], queryFn: async () => {
    const { data, error } = await (supabase as any).from("qbo_integration_state").select("status,company_name,realm_id_masked,connected_at,last_refresh_at,last_reconciliation_status,last_reconciliation_at,last_error_message_sanitized").eq("provider", "quickbooks_online").maybeSingle();
    if (error) throw error; return data as QboState | null;
  }});
  const connect = useMutation({ mutationFn: async () => {
    const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token;
    if (!token) throw new Error("Your session has expired.");
    const response = await fetch(`${import.meta.env.VITE_QBO_GATEWAY_URL}/qbo/transaction`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json(); if (!response.ok || !result.connect_url) throw new Error(result.error || "Unable to start QuickBooks connection.");
    window.location.assign(result.connect_url);
  }, onError: (error: Error) => toast({ title: "QuickBooks connection unavailable", description: error.message, variant: "destructive" }) });
  const command = useMutation({ mutationFn: async (command: "disconnect" | "reconcile") => {
    const { data: sessionData } = await supabase.auth.getSession(); const token = sessionData.session?.access_token;
    const response = await fetch(`${import.meta.env.VITE_QBO_GATEWAY_URL}/qbo/command`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ command }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to queue command."); return command;
  }, onSuccess: (command) => toast({ title: command === "reconcile" ? "Reconciliation queued" : "Disconnect queued", description: "OptiLens Local will process this request securely." }), onError: (error: Error) => toast({ title: "QuickBooks command unavailable", description: error.message, variant: "destructive" }) });
  const status = state.data?.status ?? "not_connected";
  return <Card>
    <CardHeader><CardTitle className="flex items-center justify-between text-base"><span>QuickBooks Online</span><Badge variant="outline">{status.replaceAll("_", " ")}</Badge></CardTitle><CardDescription>Production · Accounting. Credentials and tokens are managed server-side only.</CardDescription></CardHeader>
    <CardContent className="space-y-3 text-sm"><dl className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Company</dt><dd>{state.data?.company_name || "—"}</dd></div><div><dt className="text-muted-foreground">Realm ID</dt><dd>{state.data?.realm_id_masked || "—"}</dd></div><div><dt className="text-muted-foreground">Connected</dt><dd>{date(state.data?.connected_at ?? null)}</dd></div><div><dt className="text-muted-foreground">Last token refresh</dt><dd>{date(state.data?.last_refresh_at ?? null)}</dd></div><div><dt className="text-muted-foreground">Last reconciliation</dt><dd>{state.data?.last_reconciliation_status || "—"} · {date(state.data?.last_reconciliation_at ?? null)}</dd></div></dl>
      {state.data?.last_error_message_sanitized && <p className="text-destructive">{state.data.last_error_message_sanitized}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={() => connect.mutate()} disabled={connect.isPending}>{status === "connected" ? "Reconnect" : "Connect QuickBooks"}</Button><Button variant="outline" onClick={() => command.mutate("disconnect")} disabled={command.isPending || status === "not_connected"}>Disconnect</Button><Button variant="outline" onClick={() => command.mutate("reconcile")} disabled={command.isPending || status !== "connected"}>Run reconciliation</Button><Button variant="outline" disabled title="Available after the Local results viewer is deployed">View reconciliation results</Button></div>
    </CardContent>
  </Card>;
}
