import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type RuleSet = { id: string; name: string; version: number; status: "draft" | "published" | "archived"; notes: string | null; updated_at: string };
type Rule = { id: string; product_id: string; tier: "good" | "better" | "best"; priority: number; conditions: Record<string, unknown>; coating: string | null; reasons: string[]; warnings: string[]; turnaround_min_days: number | null; turnaround_max_days: number | null; lens?: { name: string } | null };
type LensOption = { id: string; name: string };

const splitLines = (value: string) => value.split(/\r?\n|;/).map((entry) => entry.trim()).filter(Boolean);

const LensAssistantRulesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [setName, setSetName] = useState("Classic Visions approved lens rules");
  const [productId, setProductId] = useState("");
  const [tier, setTier] = useState<Rule["tier"]>("good");
  const [primaryUse, setPrimaryUse] = useState("");
  const [frameType, setFrameType] = useState("");
  const [priceLevel, setPriceLevel] = useState("");
  const [lightPreference, setLightPreference] = useState("");
  const [coating, setCoating] = useState("");
  const [reasons, setReasons] = useState("");
  const [warnings, setWarnings] = useState("");
  const [turnaroundMin, setTurnaroundMin] = useState("");
  const [turnaroundMax, setTurnaroundMax] = useState("");

  const ruleSetsQuery = useQuery<RuleSet[]>({
    queryKey: ["lens-recommendation-rule-sets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("lens_recommendation_rule_sets").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    retry: false,
  });
  const ruleSets = ruleSetsQuery.data ?? [];
  const activeSetId = selectedSetId || ruleSets.find((set) => set.status === "draft")?.id || ruleSets[0]?.id || "";
  const activeSet = ruleSets.find((set) => set.id === activeSetId) ?? null;

  const rulesQuery = useQuery<Rule[]>({
    queryKey: ["lens-recommendation-rules", activeSetId],
    enabled: Boolean(activeSetId),
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("lens_recommendation_rules").select("*,lens:lenses(name)").eq("rule_set_id", activeSetId).order("tier").order("priority");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lensesQuery = useQuery<LensOption[]>({
    queryKey: ["lens-assistant-active-lenses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("lenses").select("id,name").eq("is_active", true).eq("show_on_website", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const nextVersion = useMemo(() => Math.max(0, ...ruleSets.map((set) => set.version)) + 1, [ruleSets]);

  const createSet = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).from("lens_recommendation_rule_sets").insert({ name: setName.trim(), version: nextVersion, status: "draft" }).select("*").single();
      if (error) throw error;
      return data as RuleSet;
    },
    onSuccess: async (set) => {
      setSelectedSetId(set.id);
      await queryClient.invalidateQueries({ queryKey: ["lens-recommendation-rule-sets"] });
      toast({ title: "Draft rule set created" });
    },
  });

  const addRule = useMutation({
    mutationFn: async () => {
      if (!activeSetId || !productId || !reasons.trim()) throw new Error("Choose a product and add at least one approved reason.");
      const conditions: Record<string, string[]> = {};
      if (primaryUse) conditions.use_cases = [primaryUse];
      if (frameType) conditions.frame_types = [frameType];
      if (priceLevel) conditions.price_levels = [priceLevel];
      if (lightPreference) conditions.light_preferences = [lightPreference];
      const { error } = await (supabase as any).from("lens_recommendation_rules").insert({
        rule_set_id: activeSetId,
        product_id: productId,
        tier,
        priority: 100,
        conditions,
        coating: coating.trim() || null,
        reasons: splitLines(reasons),
        warnings: splitLines(warnings),
        turnaround_min_days: turnaroundMin ? Number(turnaroundMin) : null,
        turnaround_max_days: turnaroundMax ? Number(turnaroundMax) : null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setProductId(""); setReasons(""); setWarnings(""); setCoating("");
      await queryClient.invalidateQueries({ queryKey: ["lens-recommendation-rules", activeSetId] });
      toast({ title: "Controlled rule added" });
    },
  });

  const removeRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("lens_recommendation_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lens-recommendation-rules", activeSetId] }),
  });

  const publishSet = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.rpc as any)("publish_lens_recommendation_rule_set", { p_rule_set_id: activeSetId });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lens-recommendation-rule-sets"] });
      toast({ title: "Rule set published", description: "The public assistant can now use this approved version." });
    },
  });

  const unavailable = ruleSetsQuery.error && /lens_recommendation_rule_sets|schema cache|does not exist/i.test(String((ruleSetsQuery.error as any)?.message ?? ""));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-semibold">Lens Assistant Rules</h1><p className="text-sm text-muted-foreground">Only a published, validated rule set can produce customer recommendations.</p></div>
      {unavailable ? <Alert><ShieldCheck className="h-4 w-4" /><AlertTitle>Database release required</AlertTitle><AlertDescription>Apply the smart-customer-journey migration before configuring controlled recommendations.</AlertDescription></Alert> : null}

      <Card><CardHeader><CardTitle>Rule set versions</CardTitle><CardDescription>Create a draft, review every outcome, then publish one approved version.</CardDescription></CardHeader><CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3"><Input className="max-w-md" value={setName} onChange={(event) => setSetName(event.target.value)} /><Button onClick={() => createSet.mutate()} disabled={!setName.trim() || createSet.isPending}><Plus className="mr-2 h-4 w-4" />New version {nextVersion}</Button></div>
        <div className="flex flex-wrap gap-2">{ruleSets.map((set) => <button key={set.id} onClick={() => setSelectedSetId(set.id)} className={`rounded-lg border px-3 py-2 text-left text-sm ${activeSetId === set.id ? "border-primary bg-primary/10" : "hover:bg-muted"}`}><span className="font-semibold">v{set.version} · {set.name}</span><Badge variant="outline" className="ml-2 capitalize">{set.status}</Badge></button>)}</div>
      </CardContent></Card>

      {activeSet ? <>
        <Card><CardHeader><CardTitle>Add a structured rule to v{activeSet.version}</CardTitle><CardDescription>Blank conditions mean the rule can match any value for that field. Reasons and warnings are rendered exactly as approved.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 md:col-span-2"><Label>Approved website lens</Label><select value={productId} onChange={(event) => setProductId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Choose product…</option>{(lensesQuery.data ?? []).map((lens) => <option key={lens.id} value={lens.id}>{lens.name}</option>)}</select></div>
          <div className="space-y-2"><Label>Tier</Label><select value={tier} onChange={(event) => setTier(event.target.value as Rule["tier"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="good">Good</option><option value="better">Better</option><option value="best">Best</option></select></div>
          <div className="space-y-2"><Label>Primary use</Label><select value={primaryUse} onChange={(event) => setPrimaryUse(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Any</option><option value="general">General</option><option value="driving">Driving</option><option value="computer">Computer</option><option value="outdoor">Outdoor</option><option value="reading">Reading</option></select></div>
          <div className="space-y-2"><Label>Frame</Label><select value={frameType} onChange={(event) => setFrameType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Any</option><option value="full-rim">Full rim</option><option value="semi-rimless">Semi-rimless</option><option value="rimless">Rimless</option><option value="sports">Sports / wrap</option></select></div>
          <div className="space-y-2"><Label>Price level</Label><select value={priceLevel} onChange={(event) => setPriceLevel(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Any</option><option value="good">Good</option><option value="better">Better</option><option value="best">Best</option></select></div>
          <div className="space-y-2"><Label>Light preference</Label><select value={lightPreference} onChange={(event) => setLightPreference(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Any</option><option value="clear">Clear</option><option value="photochromic">Photochromic</option><option value="polarized">Polarized</option><option value="tinted">Tinted</option></select></div>
          <div className="space-y-2"><Label>Approved coating text</Label><Input value={coating} onChange={(event) => setCoating(event.target.value)} placeholder="Optional" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Approved reasons</Label><Textarea value={reasons} onChange={(event) => setReasons(event.target.value)} placeholder="One reason per line" /></div>
          <div className="space-y-2 md:col-span-2"><Label>Technical warnings</Label><Textarea value={warnings} onChange={(event) => setWarnings(event.target.value)} placeholder="One warning per line" /></div>
          <div className="space-y-2"><Label>Turnaround min days</Label><Input type="number" min={0} value={turnaroundMin} onChange={(event) => setTurnaroundMin(event.target.value)} /></div>
          <div className="space-y-2"><Label>Turnaround max days</Label><Input type="number" min={0} value={turnaroundMax} onChange={(event) => setTurnaroundMax(event.target.value)} /></div>
          <div className="flex items-end md:col-span-2"><Button onClick={() => addRule.mutate()} disabled={addRule.isPending || activeSet.status === "published"}><Plus className="mr-2 h-4 w-4" />Add rule</Button></div>
        </CardContent></Card>

        <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Rules in this version</CardTitle><CardDescription>{(rulesQuery.data ?? []).length} controlled outcome(s)</CardDescription></div><Button onClick={() => publishSet.mutate()} disabled={publishSet.isPending || !(rulesQuery.data ?? []).length || activeSet.status === "published"}>{publishSet.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{activeSet.status === "published" ? "Published" : "Publish approved set"}</Button></CardHeader><CardContent>
          <div className="space-y-3">{(rulesQuery.data ?? []).map((rule) => <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><Badge className="capitalize">{rule.tier}</Badge><strong>{rule.lens?.name ?? rule.product_id}</strong>{activeSet.status === "published" ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}</div><p className="mt-2 text-sm text-muted-foreground">{rule.reasons.join(" ")}</p><p className="mt-1 text-xs text-muted-foreground">Conditions: {Object.keys(rule.conditions ?? {}).length ? JSON.stringify(rule.conditions) : "Any eligible prescription"}</p></div>{activeSet.status !== "published" ? <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeRule.mutate(rule.id)}><Trash2 className="h-4 w-4" /></Button> : null}</div>)}</div>
        </CardContent></Card>
      </> : null}
    </div>
  );
};

export default LensAssistantRulesPage;
