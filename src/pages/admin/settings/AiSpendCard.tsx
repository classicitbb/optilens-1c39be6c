import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

type Snapshot = {
  provider: string;
  product: string;
  unit: "USD" | "credits" | "pages";
  balance_amount: number | null;
  credit_capacity_amount: number | null;
  used_30d_amount: number | null;
  spend_30d_usd: number | null;
  as_of: string;
};
type Daily = {
  day: string;
  provider: string;
  product: string;
  function_name: string;
  requests: number;
  successful_requests: number;
  input_tokens: number;
  output_tokens: number;
  units: number;
  charge_usd: number;
};
type Provider = {
  provider: string;
  product: string;
  label: string;
  description: string;
  unit: Snapshot["unit"];
  billingUrl: string;
  config: boolean;
};

const PROVIDERS: Provider[] = [
  { provider: "anthropic", product: "api", label: "Anthropic API", description: "Iris and Portal Copilot", unit: "USD", billingUrl: "https://platform.claude.com/settings/billing", config: true },
  { provider: "lovable-ai", product: "gateway", label: "Lovable AI gateway", description: "Public assistant, lead intelligence, outreach, and voice", unit: "USD", billingUrl: "https://lovable.dev/settings/billing", config: false },
  { provider: "lovable-editor", product: "editor", label: "Lovable build credits", description: "Build usage category; may share a wallet with Run credits", unit: "credits", billingUrl: "https://lovable.dev/settings/billing", config: false },
  { provider: "google-document-ai", product: "ocr", label: "Google Document AI", description: "Shipment OCR; currently pending configuration", unit: "USD", billingUrl: "https://console.cloud.google.com/billing", config: true },
  { provider: "higgsfield", product: "seedance", label: "Higgsfield", description: "Local Seedance example, outside the hosted site", unit: "credits", billingUrl: "https://higgsfield.ai/", config: false },
  { provider: "openai", product: "api", label: "OpenAI", description: "Key slot only; no direct website calls", unit: "USD", billingUrl: "https://platform.openai.com/usage", config: true },
  { provider: "xai", product: "api", label: "xAI / Grok", description: "Key slot only; no website calls", unit: "USD", billingUrl: "https://console.x.ai/", config: true },
  { provider: "copilot", product: "api", label: "Copilot", description: "Key slot only; no website calls", unit: "USD", billingUrl: "https://admin.microsoft.com/", config: true },
];

const money = (value: number) => `$${value > 0 && value < 0.01 ? value.toFixed(6) : value.toFixed(2)} USD`;
const amount = (value: number | null | undefined, unit: string) => value == null ? "Unknown" : unit === "USD" ? money(value) : `${value.toLocaleString()} ${unit}`;
const parseNonnegative = (value: string) => value.trim() === "" ? null : Number(value);

function ProviderPanel({ provider, snapshot, daily, usageAvailable, onOpenConfig }: {
  provider: Provider;
  snapshot?: Snapshot;
  daily: Daily[];
  usageAvailable: boolean;
  onOpenConfig: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [now] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    unit: snapshot?.unit ?? provider.unit,
    balance: snapshot?.balance_amount?.toString() ?? "",
    capacity: snapshot?.credit_capacity_amount?.toString() ?? "",
    used: snapshot?.used_30d_amount?.toString() ?? "",
    spend: snapshot?.spend_30d_usd?.toString() ?? "",
  });
  const rows = daily.filter((row) => row.provider === provider.provider && row.product === provider.product);
  const requests = rows.reduce((sum, row) => sum + Number(row.requests), 0);
  const successful = rows.reduce((sum, row) => sum + Number(row.successful_requests), 0);
  const inputTokens = rows.reduce((sum, row) => sum + Number(row.input_tokens), 0);
  const outputTokens = rows.reduce((sum, row) => sum + Number(row.output_tokens), 0);
  const pages = rows.reduce((sum, row) => sum + Number(row.units), 0);
  const providerCharge = rows.reduce((sum, row) => sum + Number(row.charge_usd), 0);
  const manualSpend = snapshot?.spend_30d_usd == null ? null : Number(snapshot.spend_30d_usd);
  const requestCost = successful > 0 && providerCharge > 0 ? providerCharge / successful : successful > 0 && manualSpend != null ? manualSpend / successful : null;
  const requestCostDetail = providerCharge > 0 ? "Provider-reported charge divided by successful calls" : manualSpend != null ? "Approximate: manually entered spend divided by tracked calls; may include other usage" : "No reconciled charge available";
  const balance = snapshot?.balance_amount == null ? null : Number(snapshot.balance_amount);
  const unit = snapshot?.unit ?? provider.unit;
  const capacity = snapshot?.credit_capacity_amount == null ? null : Number(snapshot.credit_capacity_amount);
  const used = snapshot?.used_30d_amount == null ? null : Number(snapshot.used_30d_amount);
  const snapshotFresh = snapshot && now - new Date(snapshot.as_of).getTime() < 7 * 86400000;
  const daysLeft = snapshotFresh && balance != null && used != null && used > 0 ? Math.floor(balance / (used / 30)) : null;
  const topUpDate = daysLeft == null ? null : new Date(now + daysLeft * 86400000).toLocaleDateString();
  const fill = balance != null && capacity != null && capacity > 0 ? Math.max(0, Math.min(100, balance / capacity * 100)) : null;
  const save = useMutation({
    mutationFn: async () => {
      const values = [form.balance, form.capacity, form.used, form.spend].map(parseNonnegative);
      if (values.some((value) => value != null && (!Number.isFinite(value) || value < 0))) throw new Error("Enter a nonnegative number or leave the field blank.");
      if (values[1] != null && values[1] <= 0) throw new Error("Capacity must be greater than zero.");
      if (values[0] != null && values[1] != null && values[0] > values[1]) throw new Error("Remaining balance cannot exceed capacity.");
      const { error } = await (supabase as any).from("ai_spend_snapshots").upsert({
        provider: provider.provider, product: provider.product, unit: form.unit,
        balance_amount: values[0], credit_capacity_amount: values[1],
        used_30d_amount: values[2], spend_30d_usd: values[3],
        source: "manual", as_of: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "provider,product" });
      if (error) throw error;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["ai-spend-snapshots"] }); setEditing(false); toast({ title: "Billing snapshot saved" }); },
    onError: (error) => toast({ title: "Could not save billing snapshot", description: error instanceof Error ? error.message : String(error), variant: "destructive" }),
  });

  return <AccordionItem value={`${provider.provider}-${provider.product}`} className="rounded-lg border px-4">
    <AccordionTrigger className="gap-4 text-left hover:no-underline">
      <span className="min-w-0 flex-1"><span className="block font-semibold">{provider.label}</span><span className="block text-xs font-normal text-muted-foreground">{provider.description}</span></span>
      <span className="mr-3 shrink-0 text-right text-sm"><span className="block">{amount(balance, unit)} left</span><span className="block text-xs font-normal text-muted-foreground">{topUpDate == null ? "Top-up date unknown" : `Around ${topUpDate} at recent pace`}</span></span>
    </AccordionTrigger>
    <AccordionContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Requests, last 30 days" value={usageAvailable ? requests.toLocaleString() : "Unknown"} detail={usageAvailable ? `${(requests / 30).toFixed(1)} per day; ${successful} succeeded` : "Usage ledger unavailable"} />
        <Metric label="Cost per request" value={requestCost == null ? "Unknown" : money(requestCost)} detail={requestCostDetail} />
        <Metric label="Spend, last 30 days" value={snapshot?.spend_30d_usd == null ? "Unknown" : money(Number(snapshot.spend_30d_usd))} detail={snapshot ? "Manually reconciled" : "No billing snapshot"} />
        <Metric label="Used per day" value={used == null ? "Unknown" : amount(used / 30, unit)} detail="30-day average from billing snapshot" />
      </div>
      {fill == null ? <p className="text-xs text-muted-foreground">Fill level unavailable until balance and capacity are entered.</p> : <div><div className="mb-1 flex justify-between text-xs"><span>Credit fill level</span><span>{fill.toFixed(0)}%</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${fill}%` }} /></div></div>}
      <p className="text-xs text-muted-foreground">{inputTokens || outputTokens ? `${inputTokens.toLocaleString()} input / ${outputTokens.toLocaleString()} output tokens recorded. ` : ""}{pages ? `${pages.toLocaleString()} pages recorded. ` : ""}Request tracking begins after the Edge functions are deployed. Balances and spend are manually entered; last reconciled {snapshot ? new Date(snapshot.as_of).toLocaleString() : "never"}.{snapshot && !snapshotFresh ? " Snapshot is stale; refresh it for a top-up forecast." : ""}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setForm({ unit, balance: snapshot?.balance_amount?.toString() ?? "", capacity: snapshot?.credit_capacity_amount?.toString() ?? "", used: snapshot?.used_30d_amount?.toString() ?? "", spend: snapshot?.spend_30d_usd?.toString() ?? "" }); setEditing(!editing); }}>Update billing snapshot</Button>
        {provider.config && <Button size="sm" variant="outline" onClick={onOpenConfig}>Provider configuration</Button>}
        <Button size="sm" variant="outline" asChild><a href={provider.billingUrl} target="_blank" rel="noopener noreferrer">Provider settings / billing <ExternalLink className="ml-1 h-3 w-3" /></a></Button>
      </div>
      {editing && <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-4">
        {provider.provider === "lovable-ai" && <div className="space-y-1 sm:col-span-2 lg:col-span-4"><Label htmlFor="lovable-ai-unit">Lovable balance unit</Label><select id="lovable-ai-unit" className="block h-10 rounded-md border bg-background px-3" value={form.unit} onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value as Snapshot["unit"], balance: "", capacity: "", used: "" }))}><option value="USD">USD</option><option value="credits">Credits</option></select><p className="text-xs text-muted-foreground">Use the unit shown on your Lovable billing page. A shared wallet should be entered on one Lovable row only.</p></div>}
        <Entry label={`Remaining (${form.unit})`} value={form.balance} onChange={(balance) => setForm((prev) => ({ ...prev, balance }))} />
        <Entry label={`Full allocation (${form.unit})`} value={form.capacity} onChange={(capacity) => setForm((prev) => ({ ...prev, capacity }))} />
        <Entry label={`Used in 30 days (${form.unit})`} value={form.used} onChange={(usedValue) => setForm((prev) => ({ ...prev, used: usedValue }))} />
        <Entry label="Spend in 30 days (USD)" value={form.spend} onChange={(spend) => setForm((prev) => ({ ...prev, spend }))} />
        <div className="sm:col-span-2 lg:col-span-4"><Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>Save snapshot</Button></div>
      </div>}
    </AccordionContent>
  </AccordionItem>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div>;
}
function Entry({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-1"><Label>{label}</Label><Input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Unknown" /></div>;
}

export default function AiSpendCard({ enabled, onOpenConfig }: { enabled: boolean; onOpenConfig: () => void }) {
  const snapshots = useQuery({ queryKey: ["ai-spend-snapshots"], enabled, queryFn: async () => {
    const { data, error } = await (supabase as any).from("ai_spend_snapshots").select("provider,product,unit,balance_amount,credit_capacity_amount,used_30d_amount,spend_30d_usd,as_of");
    if (error) throw error;
    return data as Snapshot[];
  } });
  const daily = useQuery({ queryKey: ["ai-spend-daily"], enabled, queryFn: async () => {
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const since = new Date(today); since.setUTCDate(since.getUTCDate() - 30);
    const { data, error } = await (supabase as any).from("ai_spend_daily").select("day,provider,product,function_name,requests,successful_requests,input_tokens,output_tokens,units,charge_usd").gte("day", since.toISOString()).lt("day", today.toISOString());
    if (error) throw error;
    return data as Daily[];
  } });
  return <Card><CardHeader><CardTitle>AI spend and credits</CardTitle><CardDescription>Provider-by-provider requests, cost, balance, and estimated top-up timing. Billing figures are entered from provider statements until a read-only billing feed is connected.</CardDescription></CardHeader><CardContent className="space-y-3">
    {(snapshots.isError || daily.isError) && <p role="alert" className="text-sm text-destructive">Usage data is unavailable. The database migration may still need deployment, or this account may lack admin access.</p>}
    <Accordion type="multiple" className="space-y-2">{PROVIDERS.map((provider) => <ProviderPanel key={`${provider.provider}-${provider.product}`} provider={provider} snapshot={snapshots.data?.find((row) => row.provider === provider.provider && row.product === provider.product)} daily={daily.data ?? []} usageAvailable={daily.data != null} onOpenConfig={onOpenConfig} />)}</Accordion>
  </CardContent></Card>;
}
