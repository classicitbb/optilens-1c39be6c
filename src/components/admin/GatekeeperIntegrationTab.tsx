import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Lock, PlugZap, ShieldCheck } from "lucide-react";

type Status = "not_configured" | "connected" | "error";
type Settings = {
  environment: "staging" | "production";
  origin_lab_id: string;
  lab_name: string;
  enabled: boolean;
  has_credentials: boolean;
  status: Status;
  last_connected_at: string | null;
  last_auth_refresh_at: string | null;
  last_receipt_at: string | null;
  last_error: string | null;
};
type Contract = {
  id: string;
  origin_lab_id: string;
  origin_retailer_name: string;
  receiver_lab_id: string;
  receiver_retailer_name: string;
  origin_type: string | null;
  receiver_type: string | null;
  is_active: boolean;
};

const STATUS_CLASS: Record<Status, string> = {
  connected: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  error: "bg-red-500/10 text-red-700 border-red-300",
  not_configured: "bg-slate-500/10 text-slate-700 border-slate-300",
};

const formatDate = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "—";

export function GatekeeperIntegrationTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["gatekeeper-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("gatekeeper_settings") as any)
        .select("environment,origin_lab_id,lab_name,enabled,has_credentials,status,last_connected_at,last_auth_refresh_at,last_receipt_at,last_error")
        .eq("tenant_key", "default").maybeSingle();
      if (error) throw error;
      return (data ?? null) as Settings | null;
    },
  });
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["gatekeeper-contracts"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("gatekeeper_contracts") as any)
        .select("id,origin_lab_id,origin_retailer_name,receiver_lab_id,receiver_retailer_name,origin_type,receiver_type,is_active")
        .order("receiver_lab_id");
      if (error) throw error;
      return (data ?? []) as Contract[];
    },
    enabled: !!settings?.has_credentials,
  });

  const [environmentOverride, setEnvironmentOverride] = useState<"staging" | "production" | null>(null);
  const [originLabIdOverride, setOriginLabIdOverride] = useState<string | null>(null);
  const [labNameOverride, setLabNameOverride] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState("");
  const [selectedContractId, setSelectedContractId] = useState("");
  const [enabledOverride, setEnabledOverride] = useState<boolean | null>(null);
  const environment = environmentOverride ?? settings?.environment ?? "staging";
  const originLabId = originLabIdOverride ?? settings?.origin_lab_id ?? "1369";
  const labName = labNameOverride ?? settings?.lab_name ?? "classic-sending";
  const enabled = enabledOverride ?? settings?.enabled ?? false;
  const activeContractId = contracts.find((contract) => contract.is_active)?.id ?? contracts[0]?.id ?? "";
  const routeContractId = selectedContractId || activeContractId;

  const invalidate = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["gatekeeper-settings"] }),
    qc.invalidateQueries({ queryKey: ["gatekeeper-contracts"] }),
  ]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gatekeeper-orders", {
        body: { action: "connect", environment, originLabId, labName, pinCode },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Gatekeeper did not confirm the connection.");
    },
    onSuccess: async () => {
      setPinCode("");
      setSelectedContractId("");
      await invalidate();
      toast({ title: "Gatekeeper connected", description: "Credentials and sending contracts were stored securely. Select the contract to use below." });
    },
    onError: (error: Error) => toast({ title: "Gatekeeper connection failed", description: error.message, variant: "destructive" }),
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("gatekeeper-orders", { body: { action: "refresh-contracts" } });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Gatekeeper did not return its contracts.");
    },
    onSuccess: async () => {
      setSelectedContractId("");
      await invalidate();
      toast({ title: "Gatekeeper contracts refreshed", description: "No order or status data was requested." });
    },
    onError: (error: Error) => toast({ title: "Could not refresh contracts", description: error.message, variant: "destructive" }),
  });

  const routeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("set_gatekeeper_delivery_route", {
        p_contract_id: routeContractId,
        p_enabled: enabled,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidate();
      toast({ title: enabled ? "Gatekeeper outbound delivery enabled" : "Gatekeeper outbound delivery disabled", description: "The selected contract is ready for the manual Gatekeeper release option." });
    },
    onError: (error: Error) => toast({ title: "Could not save Gatekeeper route", description: error.message, variant: "destructive" }),
  });

  if (settingsLoading) return <div className="flex min-h-[20vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const status = settings?.status ?? "not_configured";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" /> Gatekeeper connection</CardTitle>
          <CardDescription>
            Outbound Rx orders only. The one-time PIN is exchanged server-side for encrypted JWT credentials; it is never stored or returned to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(value: "staging" | "production") => setEnvironmentOverride(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="staging">Staging</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Origin lab ID</Label>
              <Input value={originLabId} onChange={(event) => setOriginLabIdOverride(event.target.value)} inputMode="numeric" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>Lab name</Label>
              <Input value={labName} onChange={(event) => setLabNameOverride(event.target.value)} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>Single-use PIN</Label>
              <Input type="password" value={pinCode} onChange={(event) => setPinCode(event.target.value)} placeholder={settings?.has_credentials ? "Enter only to rotate credentials" : "Provided by Gatekeeper"} autoComplete="new-password" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending || !originLabId || !labName || !pinCode}>
              {connectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              {settings?.has_credentials ? "Rotate connection" : "Connect Gatekeeper"}
            </Button>
            {settings?.has_credentials && <Button variant="outline" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
              {refreshMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}Refresh contracts
            </Button>}
            <Badge variant="outline" className={STATUS_CLASS[status]}>{status.replace("_", " ")}</Badge>
          </div>
          {settings?.has_credentials && <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="h-3 w-3 text-emerald-600" /> JWT and 24-hour API token are encrypted server-side. Refresh uses the cached token and will not exceed Gatekeeper’s two-authentications-per-day limit.</p>}
          {settings?.last_error && <p className="text-xs text-destructive">Last result: {settings.last_error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outbound delivery contract</CardTitle>
          <CardDescription>Select the Gatekeeper receiver for the manual Gatekeeper choice in Rx Submissions. No job-status polling is enabled.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Sending contract</Label>
              <Select value={routeContractId} onValueChange={setSelectedContractId} disabled={contractsLoading || contracts.length === 0}>
                <SelectTrigger><SelectValue placeholder={contractsLoading ? "Loading contracts…" : "Connect Gatekeeper first"} /></SelectTrigger>
                <SelectContent>{contracts.map((contract) => <SelectItem key={contract.id} value={contract.id}>{contract.receiver_lab_id} · {contract.receiver_retailer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {contracts.find((contract) => contract.id === routeContractId)
                ? <>Receiver: <strong className="text-foreground">{contracts.find((contract) => contract.id === routeContractId)?.receiver_lab_id} / {contracts.find((contract) => contract.id === routeContractId)?.receiver_retailer_name}</strong></>
                : "Choose a receiver contract after connecting."}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabledOverride(event.target.checked)} disabled={!routeContractId} /> Enable outbound Gatekeeper delivery for staff-released Rx orders</label>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => routeMutation.mutate()} disabled={routeMutation.isPending || !routeContractId}>
              {routeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save outbound route
            </Button>
            {settings?.last_receipt_at && <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Last Gatekeeper receipt: {formatDate(settings.last_receipt_at)}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Connection status</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm md:grid-cols-2">
          <div>Environment: <strong className="capitalize">{settings?.environment ?? environment}</strong></div>
          <div>JWT credentials stored: <strong>{settings?.has_credentials ? "Yes" : "No"}</strong></div>
          <div>Last connected: <strong>{formatDate(settings?.last_connected_at)}</strong></div>
          <div>Last token refresh: <strong>{formatDate(settings?.last_auth_refresh_at)}</strong></div>
        </CardContent>
      </Card>
    </div>
  );
}
