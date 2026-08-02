import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Link2 } from "lucide-react";

// Alias mapping review (INNOVA_INTEGRATION_ARCHITECTURE.md §2.2, simplified
// to a single batch-confirm table): proposals are computed client-side from
// normalized material/style text — the same equivalence idea rx-catalog-sync
// already trusts for pricing — and NOTHING is committed until a human ticks
// and confirms. Confirmed rows are what the order form's colour sub-step and
// the submission payload builder read.

interface AliasRow {
  alias: string;
  material_description: string;
  style_description: string;
  color_description: string;
  color_code: string;
  mf_type: string;
  pricing_key: string;
  is_active: boolean;
}

interface MapRow { id: string; lens_id: string; innovations_alias: string; is_primary: boolean; confirmed_at: string | null }

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/poly(carbonate)?/g, "polycarbonate")
    .replace(/photo(chromic|chromatic)?|transitions?/g, "photochromic")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const AliasMappingPage = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: lenses = [] } = useLenses();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, string>>({}); // lens_id -> alias

  const { data: aliases = [] } = useQuery<AliasRow[]>({
    queryKey: ["innovations-lens-aliases"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("innovations_lens_aliases") as any)
        .select("alias, material_description, style_description, color_description, color_code, mf_type, pricing_key, is_active")
        .eq("is_active", true)
        .limit(10000);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: existing = [] } = useQuery<MapRow[]>({
    queryKey: ["lens-alias-map-all"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("lens_alias_map") as any)
        .select("id, lens_id, innovations_alias, is_primary, confirmed_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const mappedLensIds = useMemo(() => new Set(existing.filter((m) => m.confirmed_at).map((m) => m.lens_id)), [existing]);
  const mappedAliases = useMemo(() => new Set(existing.map((m) => m.innovations_alias)), [existing]);

  // Group aliases by material+style (the colour axis collapses into one group).
  const aliasGroups = useMemo(() => {
    const groups = new Map<string, AliasRow[]>();
    for (const a of aliases) {
      const key = norm(`${a.material_description} ${a.mf_type} ${a.style_description}`);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return groups;
  }, [aliases]);

  // Proposals: for each unmapped active lens, score alias groups by token overlap.
  const proposals = useMemo(() => {
    return lenses
      .filter((l) => l.is_active && !mappedLensIds.has(l.id))
      .map((l) => {
        const lensKey = norm(`${l.material?.name ?? ""} ${l.mftype?.name ?? ""} ${l.lenstype?.name ?? ""} ${l.name}`);
        const lensTokens = new Set(lensKey.split(" "));
        let best: { key: string; score: number; rows: AliasRow[] } | null = null;
        for (const [key, rows] of aliasGroups) {
          const tokens = key.split(" ");
          if (!tokens.length) continue;
          const hits = tokens.filter((t) => lensTokens.has(t)).length;
          const score = hits / tokens.length;
          if (score > (best?.score ?? 0.49)) best = { key, score, rows };
        }
        return { lens: l, best };
      })
      .filter((p) => p.best)
      .sort((a, b) => (b.best!.score - a.best!.score));
  }, [lenses, mappedLensIds, aliasGroups]);

  const filtered = proposals.filter((p) =>
    !search || p.lens.name.toLowerCase().includes(search.toLowerCase()));

  const unmatchedAliasCount = aliases.filter((a) => !mappedAliases.has(a.alias)).length;

  const confirmMutation = useMutation({
    mutationFn: async (picks: { lensId: string; rows: AliasRow[]; confidence: number }[]) => {
      const inserts = picks.flatMap((p) =>
        p.rows.map((a, i) => ({
          lens_id: p.lensId,
          innovations_alias: a.alias,
          is_primary: i === 0, // first row (usually clear/uncoated) is the default
          match_confidence: Math.round(p.confidence * 100) / 100,
          confirmed_by: user?.id ?? null,
          confirmed_at: new Date().toISOString(),
        })),
      );
      const { error } = await (supabase.from("lens_alias_map") as any)
        .upsert(inserts, { onConflict: "lens_id,innovations_alias" });
      if (error) throw error;
      return inserts.length;
    },
    onSuccess: (n) => {
      toast({ title: "Mappings confirmed", description: `${n} alias link(s) saved.` });
      setSelected({});
      qc.invalidateQueries({ queryKey: ["lens-alias-map-all"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const confirmSelected = () => {
    const picks = filtered
      .filter((p) => selected[p.lens.id])
      .map((p) => ({
        lensId: p.lens.id,
        rows: [...p.best!.rows].sort((a, b) => a.color_code.localeCompare(b.color_code)),
        confidence: p.best!.score,
      }));
    if (picks.length) confirmMutation.mutate(picks);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Innovations Alias Mapping
        </h1>
        <Badge variant="outline" className="text-[10px]">{aliases.length} aliases synced</Badge>
        <Badge variant="outline" className="text-[10px]">{mappedLensIds.size} lenses mapped</Badge>
        <Badge variant="outline" className="text-[10px]">{unmatchedAliasCount} aliases unmatched</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter lenses…" className="h-8 text-xs w-56" />
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            disabled={!Object.values(selected).some(Boolean) || confirmMutation.isPending}
            onClick={confirmSelected}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Confirm selected ({Object.values(selected).filter(Boolean).length})
          </Button>
        </div>
      </div>

      {aliases.length === 0 && (
        <div className="text-xs text-muted-foreground border border-dashed border-border rounded p-6 text-center">
          No aliases synced yet. Run the catalog push from optilens-local (Sync → lens_aliases) first.
        </div>
      )}

      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="w-8 px-2 py-1.5" />
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">CV Lens</th>
              <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Proposed Innovations match (material · type · style)</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Colours</th>
              <th className="text-center px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((p) => {
              const rows = p.best!.rows;
              return (
                <tr key={p.lens.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-2 py-1.5 text-center">
                    <Checkbox
                      checked={!!selected[p.lens.id]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [p.lens.id]: v ? p.best!.key : "" }))}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="font-medium">{p.lens.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {p.lens.material?.name} · {p.lens.mftype?.name} · {p.lens.lenstype?.name}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    {rows[0].material_description} · {rows[0].mf_type} · {rows[0].style_description}
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <span title={rows.map((r) => r.color_description).join(", ")}>{rows.length}</span>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono">{Math.round(p.best!.score * 100)}%</td>
                </tr>
              );
            })}
            {filtered.length === 0 && aliases.length > 0 && (
              <tr><td colSpan={5} className="text-center text-xs text-muted-foreground py-6">
                Nothing left to propose — every active lens either has a confirmed mapping or no plausible match (add those manually if needed).
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > 200 && <p className="text-[10px] text-muted-foreground">Showing the first 200 — use the filter to narrow.</p>}
      <p className="text-[10px] text-muted-foreground max-w-3xl">
        Confirming links a CV lens to every colour alias in the matched Innovations material+style group; the first
        (lowest colour code, usually clear/uncoated) becomes the default. New aliases from future syncs re-appear here
        as proposals — they never auto-commit.
      </p>
    </div>
  );
};

export default AliasMappingPage;
