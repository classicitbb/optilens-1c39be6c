import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import {
  evaluateLensChain,
  summarizeLensChain,
  type ChainAlias,
  type ChainAllocation,
} from "./lensChain";

const PAGE = 1000; // PostgREST caps every response at 1000 rows regardless of .limit()

async function fetchAll<T>(table: string, columns: string, apply: (q: any) => any = (q) => q): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await apply((supabase.from(table as any) as any).select(columns)).range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...(data as T[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** Staff-only: reads the raw alias mirror, mappings, every pricelist and customer assignments. */
export function useLensChain() {
  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const aliases = useQuery({
    queryKey: ["lens-chain", "aliases"],
    queryFn: () => fetchAll<ChainAlias>(
      "innovations_lens_aliases",
      "alias, style_description, color_description, mf_type, pricing_key, suppliers",
      (q) => q.eq("is_active", true).order("alias"),
    ),
  });
  const maps = useQuery({
    queryKey: ["lens-chain", "maps"],
    queryFn: () => fetchAll<{ lens_id: string; innovations_alias: string }>(
      "lens_alias_map", "lens_id, innovations_alias", (q) => q.not("confirmed_at", "is", null).order("id"),
    ),
  });
  const versions = useQuery({
    queryKey: ["lens-chain", "versions"],
    queryFn: () => fetchAll<{ id: number; name: string }>("pricelist_versions", "id, name", (q) => q.order("id")),
  });
  const allocations = useQuery({
    queryKey: ["lens-chain", "allocations"],
    queryFn: () => fetchAll<ChainAllocation>(
      "matrix_allocations",
      "pricelist_version_id, treatment_type, category, material_index, allocated_price_bbd",
      (q) => q.eq("is_active", true).order("id"),
    ),
  });
  const assignments = useQuery({
    queryKey: ["lens-chain", "assignments"],
    queryFn: () => fetchAll<{ assigned_pricelist_id: number | null }>(
      "customers", "assigned_pricelist_id", (q) => q.not("assigned_pricelist_id", "is", null).order("id"),
    ),
  });

  const queries = [aliases, maps, versions, allocations, assignments];
  const isLoading = lensesLoading || queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error as Error | undefined;

  const chains = useMemo(() => {
    if (isLoading || error) return [];
    const confirmedLensIdsByAlias = new Map<string, string[]>();
    for (const m of maps.data ?? []) {
      const list = confirmedLensIdsByAlias.get(m.innovations_alias) ?? [];
      list.push(m.lens_id);
      confirmedLensIdsByAlias.set(m.innovations_alias, list);
    }
    const customersByVersion = new Map<number, number>();
    for (const c of assignments.data ?? []) {
      if (c.assigned_pricelist_id == null) continue;
      customersByVersion.set(c.assigned_pricelist_id, (customersByVersion.get(c.assigned_pricelist_id) ?? 0) + 1);
    }
    return evaluateLensChain({
      aliases: aliases.data ?? [],
      confirmedLensIdsByAlias,
      lensById: new Map((lenses as any[]).map((l) => [l.id, { is_active: !!l.is_active, supplier_id: l.supplier_id ?? null }])),
      versions: versions.data ?? [],
      allocations: allocations.data ?? [],
      customersByVersion,
    });
  }, [isLoading, error, aliases.data, maps.data, versions.data, allocations.data, assignments.data, lenses]);

  const summary = useMemo(() => summarizeLensChain(chains), [chains]);
  return { chains, summary, isLoading, error };
}
