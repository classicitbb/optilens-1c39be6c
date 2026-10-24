// /admin/orders/rx/settings — the rules the Rx form runs on, editable by staff:
//   Coating clashes   which add-ons cannot share a lens (addon_clash_rules)
//   Surcharges        the charges the form adds (rx_surcharge_rules)
//   Lens tips         the thresholds behind the tips on the lens card (rx_lens_advice_rules)
// Changes apply to new quotes and to any form opened afterwards.
import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAddons } from "@/hooks/useAddons";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const table = (name: string) => (supabase as any).from(name);
const fail = (title: string) => (e: Error) => toast({ variant: "destructive", title, description: e.message });

// ── clashes ───────────────────────────────────────────────────────────────────
function ClashRules() {
  const qc = useQueryClient();
  const { data: addons = [] } = useAddons();
  const name = (id: string) => addons.find((a) => a.id === id)?.name ?? id;
  const { data: rules = [] } = useQuery<{ id: string; addon_id_a: string; addon_id_b: string; reason: string }[]>({
    queryKey: ["rx-clash-rules-admin"],
    queryFn: async () => {
      const { data, error } = await table("addon_clash_rules").select("id, addon_id_a, addon_id_b, reason").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [reason, setReason] = useState("");
  const done = () => { void qc.invalidateQueries({ queryKey: ["rx-clash-rules-admin"] }); void qc.invalidateQueries({ queryKey: ["addon-clash-rules"] }); };

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await table("addon_clash_rules").insert({ addon_id_a: a, addon_id_b: b, reason: reason.trim() });
      if (error) throw error;
    },
    onSuccess: () => { setA(""); setB(""); setReason(""); done(); },
    onError: fail("Could not add the rule"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await table("addon_clash_rules").delete().eq("id", id); if (error) throw error; },
    onSuccess: done,
    onError: fail("Could not remove the rule"),
  });

  const select = "h-8 rounded-md border bg-background px-2 text-xs";
  const valid = a && b && a !== b && reason.trim();
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Two coatings that cannot go on the same lens. The form refuses the second and shows the reason.</p>
      <div className="flex flex-wrap items-end gap-2">
        <select className={select} aria-label="First coating" value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">First coating…</option>
          {addons.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <select className={select} aria-label="Second coating" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">Second coating…</option>
          {addons.filter((x) => x.id !== a).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <Input className="h-8 w-72 text-xs" placeholder="Reason shown to the person ordering" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button size="sm" className="h-8 gap-1 text-xs" disabled={!valid || add.isPending} onClick={() => add.mutate()}><Plus className="h-3 w-3" /> Add</Button>
      </div>
      <table className="w-full text-xs">
        <thead><tr className="text-left text-[10px] uppercase text-muted-foreground"><th className="py-1">Coating</th><th>Cannot be combined with</th><th>Reason</th><th /></tr></thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-1.5">{name(r.addon_id_a)}</td><td>{name(r.addon_id_b)}</td><td>{r.reason}</td>
              <td className="text-right"><Button size="sm" variant="ghost" className="h-6 px-2" aria-label="Remove rule" onClick={() => remove.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button></td>
            </tr>
          ))}
          {!rules.length && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No clash rules yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── surcharges ────────────────────────────────────────────────────────────────
interface SurchargeRow {
  code: string; label: string; detail: string | null; basis: string; amount: number; unit_amount: number;
  threshold: number | null; tier2_threshold: number | null; tier2_amount: number | null; active: boolean;
}

function SurchargeRules() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<SurchargeRow[]>({
    queryKey: ["rx-surcharges-admin"],
    queryFn: async () => {
      const { data, error } = await table("rx_surcharge_rules").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async ({ code, patch }: { code: string; patch: Partial<SurchargeRow> }) => {
      const { error } = await table("rx_surcharge_rules").update(patch).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["rx-surcharges-admin"] }); void qc.invalidateQueries({ queryKey: ["rx-surcharge-rules"] }); },
    onError: fail("Could not save the surcharge"),
  });
  const number = (row: SurchargeRow, key: "amount" | "unit_amount" | "threshold" | "tier2_threshold" | "tier2_amount", label: string) => (
    row[key] === null && !["threshold", "tier2_threshold", "tier2_amount"].includes(key) ? null : (
      <label className="flex flex-col text-[10px] text-muted-foreground">
        {label}
        <Input
          className="h-7 w-20 text-xs" type="number" step="any" defaultValue={row[key] ?? ""}
          key={`${row.code}-${key}-${row[key]}`}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v !== row[key] && (v !== null || key.startsWith("t"))) save.mutate({ code: row.code, patch: { [key]: v } });
          }}
        />
      </label>
    )
  );
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Charges the form adds to a lens order. Amounts are in BBD; a percent rule is a percentage of the subtotal, and the single-eye factor is a share of the pair price. Leave a field blank where it does not apply.
      </p>
      {rows.map((r) => (
        <div key={r.code} className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
          <div className="min-w-[200px] flex-1">
            <b className="text-xs">{r.label}</b>
            <p className="text-[11px] text-muted-foreground">{r.detail}</p>
          </div>
          {number(r, "amount", r.basis === "percent" ? "Percent" : r.basis === "multiplier" ? "Factor" : "Amount")}
          {number(r, "unit_amount", "Per unit")}
          {number(r, "threshold", "Threshold")}
          {number(r, "tier2_threshold", "Tier 2 at")}
          {number(r, "tier2_amount", "Tier 2 amount")}
          <label className="flex items-center gap-1.5 text-xs"><Switch checked={r.active} onCheckedChange={(v) => save.mutate({ code: r.code, patch: { active: v } })} /> Active</label>
        </div>
      ))}
    </div>
  );
}

// ── lens tips ─────────────────────────────────────────────────────────────────
interface AdviceRow { code: string; label: string; detail: string | null; params: Record<string, unknown>; active: boolean }

function AdviceRules() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery<AdviceRow[]>({
    queryKey: ["rx-advice-admin"],
    queryFn: async () => {
      const { data, error } = await table("rx_lens_advice_rules").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });
  const save = useMutation({
    mutationFn: async ({ code, patch }: { code: string; patch: Partial<AdviceRow> }) => {
      const { error } = await table("rx_lens_advice_rules").update(patch).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["rx-advice-admin"] }); void qc.invalidateQueries({ queryKey: ["rx-lens-advice-rules"] }); },
    onError: fail("Could not save the rule"),
  });
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        The thresholds behind the tips on the lens card. A tip only suggests — it never blocks an order. Settings are JSON; an invalid edit is not saved.
      </p>
      {rows.map((r) => (
        <div key={r.code} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <div className="flex-1"><b className="text-xs">{r.label}</b><p className="text-[11px] text-muted-foreground">{r.detail}</p></div>
            <label className="flex items-center gap-1.5 text-xs"><Switch checked={r.active} onCheckedChange={(v) => save.mutate({ code: r.code, patch: { active: v } })} /> Active</label>
          </div>
          <Textarea
            className="h-20 font-mono text-[11px]" defaultValue={JSON.stringify(r.params, null, 2)} key={`${r.code}-${JSON.stringify(r.params)}`}
            aria-label={`${r.label} settings`}
            onBlur={(e) => {
              let parsed: unknown;
              try { parsed = JSON.parse(e.target.value); } catch { toast({ variant: "destructive", title: "Not valid JSON", description: "That edit was not saved." }); return; }
              if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) { toast({ variant: "destructive", title: "Settings must be an object" }); return; }
              if (JSON.stringify(parsed) !== JSON.stringify(r.params)) save.mutate({ code: r.code, patch: { params: parsed as Record<string, unknown> } });
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default function RxRulesPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => navigate("/admin/orders/rx")}><ArrowLeft className="h-3.5 w-3.5" /> Rx Orders</Button>
        <h1 className="text-base font-semibold">Rx order rules</h1>
      </div>
      <Tabs defaultValue="clashes">
        <TabsList>
          <TabsTrigger value="clashes">Coating clashes</TabsTrigger>
          <TabsTrigger value="surcharges">Surcharges</TabsTrigger>
          <TabsTrigger value="advice">Lens tips</TabsTrigger>
        </TabsList>
        <TabsContent value="clashes"><ClashRules /></TabsContent>
        <TabsContent value="surcharges"><SurchargeRules /></TabsContent>
        <TabsContent value="advice"><AdviceRules /></TabsContent>
      </Tabs>
    </div>
  );
}
