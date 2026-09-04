import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Bot, CheckCircle2, Loader2, Lock, Plus, PlugZap, ShieldCheck } from "lucide-react";
import InnovationsSyncStatusCard from "@/components/admin/InnovationsSyncStatusCard";
import { GatekeeperIntegrationTab } from "@/components/admin/GatekeeperIntegrationTab";
import { prepareScotiaPayment, redirectToScotiaPayment, type PreparePaymentInput } from "@/lib/payments/scotiaConnect";
import AiAgentProviderCard, { type AiAgentSettingsRow } from "./AiAgentProviderCard";
import CopilotFactsCard from "./CopilotFactsCard";
import { QboIntegrationCard } from "@/components/admin/QboIntegrationCard";

// ─────────────────────────────────────────────────────────────────────────────
// Scotia eCom+ (Fiserv IPG Connect) hosted-payment credential store.
// Replaces the former Odoo integration. The StoreID + SharedSecret are stored
// encrypted server-side (payment_gateway_secrets) and never returned to the
// browser. See docs/scotia-ecom-hosted-payment-integration.md.
// ─────────────────────────────────────────────────────────────────────────────

type GatewayStatus = "not_configured" | "connected" | "error";

interface PaymentGatewaySettings {
  store_id: string | null;
  environment: "test" | "production";
  currency: string;
  timezone: string;
  enabled: boolean;
  has_secret: boolean;
  status: GatewayStatus;
  last_tested_at: string | null;
  updated_at: string;
}

/** Result of the admin IPG health check (scotia-payment `action: "probe"`). */
interface ScotiaProbeResult {
  accepted: boolean;
  classification: string;
  httpStatus: number | null;
  detail: string;
  failRc?: string | null;
  snippet: string;
  storeId: string;
  environment: string;
  currency: string;
  checkedAt: string;
}


interface DhlExpressSettings {
  account_number: string | null;
  environment: "test" | "production";
  enabled: boolean;
  has_credentials: boolean;
  status: GatewayStatus;
  last_tested_at: string | null;
  last_error: string | null;
  updated_at: string;
}

const QUICK_PICK_PROVIDERS = [
  { slug: "anthropic", label: "Anthropic" },
  { slug: "openai", label: "OpenAI" },
  { slug: "grok", label: "Grok (xAI)" },
  { slug: "copilot", label: "Copilot" },
];

const normalizeProviderSlug = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const statusMeta: Record<GatewayStatus, { label: string; className: string }> = {
  connected: { label: "Connected", className: "bg-emerald-500/10 text-emerald-700 border-emerald-300" },
  error: { label: "Error", className: "bg-red-500/10 text-red-700 border-red-300" },
  not_configured: { label: "Not configured", className: "bg-slate-500/10 text-slate-700 border-slate-300" },
};

const fmt = (value: string | null | undefined) => (value ? new Date(value).toLocaleString() : "—");

export default function IntegrationsPage() {
  const { realRole, isLoading: roleLoading } = useAdminRole();
  const isAdmin = realRole === "admin";
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["payment-gateway-settings"],
    queryFn: async () => {
      const { data, error } = await ((supabase as any).from("payment_gateway_settings") as any)
        .select("store_id,environment,currency,timezone,enabled,has_secret,status,last_tested_at,updated_at")
        .eq("tenant_key", "default")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PaymentGatewaySettings | null;
    },
    enabled: isAdmin,
  });

  const { data: dhlData, isLoading: dhlLoading } = useQuery({
    queryKey: ["dhl-express-settings"],
    queryFn: async () => {
      const { data, error } = await ((supabase as any).from("dhl_express_settings") as any)
        .select("account_number,environment,enabled,has_credentials,status,last_tested_at,last_error,updated_at")
        .eq("tenant_key", "default")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as DhlExpressSettings | null;
    },
    enabled: isAdmin,
  });

  const { data: aiAgentRows, isLoading: aiAgentLoading } = useQuery({
    queryKey: ["ai-agent-settings"],
    queryFn: async () => {
      const { data, error } = await ((supabase as any).from("ai_agent_settings") as any)
        .select("provider,model,enabled,has_secret,status,last_tested_at,last_error,updated_at")
        .eq("tenant_key", "default")
        .order("provider");
      if (error) throw error;
      return (data ?? []) as AiAgentSettingsRow[];
    },
    enabled: isAdmin,
  });

  const [form, setForm] = useState({
    store_id: "",
    environment: "test" as "test" | "production",
    currency: "840",
    timezone: "America/Barbados",
    enabled: false,
  });
  const [sharedSecret, setSharedSecret] = useState("");
  const [testPayment, setTestPayment] = useState<PreparePaymentInput | null>(null);
  const [probeResult, setProbeResult] = useState<ScotiaProbeResult | null>(null);

  const [dhlForm, setDhlForm] = useState<Partial<{
    account_number: string;
    environment: "test" | "production";
    enabled: boolean;
  }>>({});
  const [dhlUsername, setDhlUsername] = useState("");
  const [dhlPassword, setDhlPassword] = useState("");
  const [draftProviders, setDraftProviders] = useState<string[]>([]);
  const [newProviderInput, setNewProviderInput] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm({
      store_id: data.store_id ?? "",
      environment: data.environment,
      currency: "840",
      timezone: data.timezone,
      enabled: data.enabled,
    });
  }, [data]);

  const resolvedDhlForm = {
    account_number: dhlForm.account_number ?? dhlData?.account_number ?? "",
    environment: dhlForm.environment ?? dhlData?.environment ?? "test",
    enabled: dhlForm.enabled ?? dhlData?.enabled ?? false,
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("upsert_payment_gateway_settings" as never, {
        p_store_id: form.store_id,
        p_environment: form.environment,
        p_currency: "840",
        p_timezone: form.timezone,
        p_enabled: form.enabled,
        p_shared_secret: sharedSecret || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-gateway-settings"] });
      setSharedSecret("");
      toast({ title: "Payment gateway saved", description: "Scotia eCom+ settings were updated." });
    },
    onError: (error: any) => {
      toast({ title: "Unable to save", description: error.message, variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      // Reachability test: ask the edge function to build a signed (zero-impact)
      // form. This proves StoreID + SharedSecret resolve and the hash computes,
      // without charging a card.
      let passed = false;
      let testError: Error | null = null;

      try {
        const { data, error } = await supabase.functions.invoke("scotia-payment", {
          body: {
            action: "prepare",
            testMode: true,
            chargetotal: 1,
            responseSuccessURL: `${window.location.origin}/checkout`,
            responseFailURL: `${window.location.origin}/checkout`,
          },
        });
        if (error) throw new Error(error.message);
        if (!data?.formParams?.hashExtended) {
          throw new Error((data as { error?: string })?.error || "Gateway did not return a signed form.");
        }
        passed = true;
      } catch (error) {
        testError = error instanceof Error ? error : new Error(String(error));
      }

      const { error: statusError } = await supabase.rpc("record_payment_gateway_test" as never, {
        p_success: passed,
      } as never);
      if (statusError) throw new Error(`Configuration test completed, but its status could not be recorded: ${statusError.message}`);
      if (testError) {
        throw testError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-gateway-settings"] });
      qc.invalidateQueries({ queryKey: ["payment-gateway-status"] });
      setTestPayment({
        testMode: true,
        chargetotal: 1,
        responseSuccessURL: `${window.location.origin}/checkout`,
        responseFailURL: `${window.location.origin}/checkout`,
      });
      toast({ title: "Configuration valid", description: "The gateway credentials resolve and a signed form was produced." });
    },
    onError: (error: any) => {
      qc.invalidateQueries({ queryKey: ["payment-gateway-settings"] });
      qc.invalidateQueries({ queryKey: ["payment-gateway-status"] });
      toast({ title: "Test failed", description: error.message, variant: "destructive" });
    },
  });

  // IPG health check: signs a probe sale and posts it to Fiserv server-side to
  // see whether the store is actually accepted for Connect hosted-page use.
  const probeMutation = useMutation({
    mutationFn: async (): Promise<ScotiaProbeResult> => {
      const { data, error } = await supabase.functions.invoke("scotia-payment", {
        body: { action: "probe" },
      });
      if (error) throw new Error(error.message);
      if (!data || typeof (data as any).accepted !== "boolean") {
        throw new Error((data as { error?: string })?.error || "Health check returned an unexpected response.");
      }
      return data as ScotiaProbeResult;
    },
    onSuccess: (result) => {
      setProbeResult(result);
      toast({
        title: result.accepted ? "Gateway accepted the store" : "Gateway rejected the request",
        description: result.detail,
        variant: result.accepted ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setProbeResult(null);
      toast({ title: "Health check failed", description: error.message, variant: "destructive" });
    },
  });


  const saveDhlMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("upsert_dhl_express_settings" as never, {
        p_account_number: resolvedDhlForm.account_number,
        p_environment: resolvedDhlForm.environment,
        p_enabled: resolvedDhlForm.enabled,
        p_api_username: dhlUsername || null,
        p_api_password: dhlPassword || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dhl-express-settings"] });
      setDhlUsername("");
      setDhlPassword("");
      toast({ title: "DHL Express saved", description: "MyDHL API settings were updated." });
    },
    onError: (error: any) => {
      toast({ title: "Unable to save DHL Express", description: error.message, variant: "destructive" });
    },
  });

  const testDhlMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("dhl-express", { body: { action: "test" } });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "DHL Express did not confirm the configuration.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dhl-express-settings"] });
      toast({ title: "DHL Express connected", description: "Credentials and the selected API environment were verified." });
    },
    onError: (error: any) => {
      qc.invalidateQueries({ queryKey: ["dhl-express-settings"] });
      toast({ title: "DHL Express test failed", description: error.message, variant: "destructive" });
    },
  });

  const currentStatus = useMemo<GatewayStatus>(() => data?.status ?? "not_configured", [data]);
  const existingProviders = useMemo(() => (aiAgentRows ?? []).map((row) => row.provider), [aiAgentRows]);
  const draftOnlyProviders = draftProviders.filter((slug) => !existingProviders.includes(slug));

  const addProvider = (rawSlug: string) => {
    const slug = normalizeProviderSlug(rawSlug);
    if (!slug || existingProviders.includes(slug) || draftProviders.includes(slug)) return;
    setDraftProviders((prev) => [...prev, slug]);
    setNewProviderInput("");
  };
  const requiresSecret = !data?.has_secret;

  if (roleLoading || isLoading || dhlLoading || aiAgentLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment gateway</CardTitle>
          <CardDescription>Only admin users can view or update payment credentials.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            External service integrations and gateway configuration.
          </p>
        </div>
        <Badge variant="outline" className={statusMeta[currentStatus].className}>
          {statusMeta[currentStatus].label}
        </Badge>
      </div>

      <Tabs defaultValue="services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="services">Service integrations</TabsTrigger>
          <TabsTrigger value="gatekeeper">Gatekeeper</TabsTrigger>
          <TabsTrigger value="ai-agents">AI Agents</TabsTrigger>
        </TabsList>
        <TabsContent value="services" className="space-y-4">
      <InnovationsSyncStatusCard />
      <QboIntegrationCard />

      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" /> Scotia eCom+ payment gateway
              </CardTitle>
              <CardDescription>
                Issued by Scotiabank after certification. Production StoreIDs begin with “62”.
                Currency is fixed to USD (840) by the hosted-payment integration.
              </CardDescription>
            </div>
            <Badge variant="outline" className={statusMeta[currentStatus].className}>
              {statusMeta[currentStatus].label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Last tested: {fmt(data?.last_tested_at)} · Updated: {fmt(data?.updated_at)}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Store ID</Label>
              <Input
                value={form.store_id}
                onChange={(e) => setForm((p) => ({ ...p, store_id: e.target.value }))}
                placeholder="399000002"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select
                value={form.environment}
                onValueChange={(value: "test" | "production") => setForm((p) => ({ ...p, environment: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm((p) => ({ ...p, timezone: e.target.value }))}
                placeholder="America/Barbados"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shared Secret (HMAC key)</Label>
              <Input
                type="password"
                value={sharedSecret}
                onChange={(e) => setSharedSecret(e.target.value)}
                placeholder={requiresSecret ? "Required to enable the gateway" : "Leave empty to keep the stored secret"}
              />
              {data?.has_secret && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-600" /> A secret is stored. Enter a new value only to rotate it.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Enable live processing
            </label>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || (!sharedSecret && requiresSecret) || !form.store_id}
            >
              {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save configuration
            </Button>
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              {currentStatus === "error" ? "Recheck & clear error" : "Test configuration"}
            </Button>
            <Button
              variant="outline"
              onClick={() => probeMutation.mutate()}
              disabled={probeMutation.isPending || !data?.has_secret}
            >
              {probeMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Run IPG health check
            </Button>
          </div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {currentStatus === "connected" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
            )}
            {currentStatus === "connected"
              ? "Gateway is configured."
              : "Add a Store ID and Shared Secret to configure the gateway."}
          </p>
          <p className="text-xs text-muted-foreground">
            The health check signs a $1.00 probe sale and posts it to Fiserv from the server to
            see whether the store is accepted for Connect hosted-page transactions. Nothing is charged.
          </p>
          {probeResult && (
            <div className="border border-border p-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {probeResult.accepted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-destructive" />
                )}
                <span className="font-medium">
                  {probeResult.accepted ? "Hosted page rendered" : "Gateway did not render the hosted page"}
                </span>
                <Badge variant="outline">{probeResult.classification}</Badge>
                {probeResult.httpStatus !== null && <Badge variant="outline">HTTP {probeResult.httpStatus}</Badge>}
                {probeResult.failRc && <Badge variant="outline">fail_rc {probeResult.failRc}</Badge>}
              </div>
              <p className="mt-2 text-muted-foreground">{probeResult.detail}</p>
              <p className="mt-1 text-muted-foreground">
                Store {probeResult.storeId} · {probeResult.environment} · checked{" "}
                {new Date(probeResult.checkedAt).toLocaleString()}
              </p>
              {probeResult.snippet && (
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words bg-muted p-2">
                  {probeResult.snippet}
                </pre>
              )}
            </div>
          )}

        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" /> DHL Express MyDHL API
          </CardTitle>
          <CardDescription>
            Server-side credentials for on-demand DHL shipment tracking and landed-cost estimates. Basic Auth credentials are encrypted and never returned to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>DHL Express account number</Label>
              <Input value={resolvedDhlForm.account_number} onChange={(e) => setDhlForm((p) => ({ ...p, account_number: e.target.value }))} placeholder="Your DHL Express account number" />
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={resolvedDhlForm.environment} onValueChange={(value: "test" | "production") => setDhlForm((p) => ({ ...p, environment: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API username</Label>
              <Input value={dhlUsername} onChange={(e) => setDhlUsername(e.target.value)} placeholder={dhlData?.has_credentials ? "Leave empty to keep the stored credentials" : "Provided by DHL Express"} autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label>API password</Label>
              <Input type="password" value={dhlPassword} onChange={(e) => setDhlPassword(e.target.value)} placeholder={dhlData?.has_credentials ? "Leave empty to keep the stored credentials" : "Provided by DHL Express"} autoComplete="new-password" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={resolvedDhlForm.enabled} onChange={(e) => setDhlForm((p) => ({ ...p, enabled: e.target.checked }))} />
            Enable DHL Express tracking and landed-cost services
          </label>
          {dhlData?.has_credentials && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3 w-3 text-emerald-600" /> Credentials are stored. Enter both fields only to rotate them.
            </p>
          )}
          {dhlData?.last_error && <p className="text-xs text-destructive">Last test: {dhlData.last_error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => saveDhlMutation.mutate()}
              disabled={saveDhlMutation.isPending || !resolvedDhlForm.account_number || (!dhlData?.has_credentials && (!dhlUsername || !dhlPassword)) || (!!dhlUsername !== !!dhlPassword)}
            >
              {saveDhlMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save DHL Express
            </Button>
            <Button variant="outline" onClick={() => testDhlMutation.mutate()} disabled={testDhlMutation.isPending || !dhlData?.has_credentials}>
              {testDhlMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlugZap className="mr-2 h-4 w-4" />}
              Test configuration
            </Button>
            <Badge variant="outline" className={statusMeta[dhlData?.status ?? "not_configured"].className}>
              {statusMeta[dhlData?.status ?? "not_configured"].label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Test performs DHL’s read-only reference-data request. It does not quote, create a shipment, allocate an identifier, or book a pickup. DHL’s test environment is limited to 500 service calls per day.
          </p>
        </CardContent>
      </Card>



      <Dialog open={testPayment !== null} onOpenChange={(open) => !open && setTestPayment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Scotia secure payment-window test</DialogTitle>
            <DialogDescription>
              This uses the configured gateway and opens Scotia's hosted page as a full-page redirect.

            </DialogDescription>
          </DialogHeader>
          {testPayment && (
            <Button
              type="button"
              onClick={async () => {
                try {
                  const prepared = await prepareScotiaPayment(testPayment);
                  redirectToScotiaPayment(prepared);
                } catch (error) {
                  toast({
                    title: "Payment-window test failed",
                    description: error instanceof Error ? error.message : String(error),
                    variant: "destructive",
                  });
                }
              }}
            >
              Open Scotia test payment page
            </Button>
          )}
        </DialogContent>
      </Dialog>
        </TabsContent>
        <TabsContent value="gatekeeper" className="mt-0">
          <GatekeeperIntegrationTab />
        </TabsContent>
        <TabsContent value="ai-agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bot className="h-4 w-4" /> AI provider keys
              </CardTitle>
              <CardDescription>
                API keys for AI providers, stored encrypted server-side and never returned to the browser.
                Only the Anthropic key is actually used today — by Portal Copilot, for chat, workflow routing
                and lookups (it falls back to the ANTHROPIC_API_KEY function secret if this isn't set). Other
                providers are stored for whenever something is built to use them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {QUICK_PICK_PROVIDERS.filter((p) => !existingProviders.includes(p.slug) && !draftProviders.includes(p.slug)).map((p) => (
                  <Button key={p.slug} variant="outline" size="sm" onClick={() => addProvider(p.slug)}>
                    <Plus className="mr-2 h-4 w-4" /> {p.label}
                  </Button>
                ))}
                <div className="flex items-center gap-2">
                  <Input
                    value={newProviderInput}
                    onChange={(e) => setNewProviderInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addProvider(newProviderInput); }}
                    placeholder="Other provider name"
                    className="h-9 w-48"
                  />
                  <Button variant="outline" size="sm" onClick={() => addProvider(newProviderInput)} disabled={!newProviderInput.trim()}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {(aiAgentRows ?? []).map((row) => (
            <AiAgentProviderCard
              key={row.provider}
              provider={row.provider}
              row={row}
              canTest={row.provider === "anthropic"}
              onRemoveDraft={() => {}}
            />
          ))}
          {draftOnlyProviders.map((slug) => (
            <AiAgentProviderCard
              key={slug}
              provider={slug}
              row={null}
              canTest={slug === "anthropic"}
              onRemoveDraft={() => setDraftProviders((prev) => prev.filter((p) => p !== slug))}
            />
          ))}

          <CopilotFactsCard enabled={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
