import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Confirmed Innovations alias links per lens, for surfacing the mapping where
// lenses are actually managed. A lens with no link cannot resolve an alias at
// submission time, so this is the catalog-side view of the same gap the alias
// mapping screen curates.

export interface LensAliasLink {
  /** Confirmed colour aliases enabled for this lens. */
  count: number;
  /** The alias used when the customer doesn't pick a colour. */
  primary: string | null;
}

const PAGE = 1000; // PostgREST caps every response at 1000 rows

export const useLensAliasLinks = (enabled = true) =>
  useQuery<Map<string, LensAliasLink>>({
    queryKey: ["lens-alias-links"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const byLens = new Map<string, LensAliasLink>();
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await (supabase.from("lens_alias_map") as any)
          .select("lens_id, innovations_alias, is_primary, confirmed_at")
          .not("confirmed_at", "is", null)
          .range(from, from + PAGE - 1);
        if (error) {
          // The mapping table is a later addition; a catalog screen must not
          // break because it hasn't shipped to this environment yet.
          if (/does not exist|schema cache/i.test(error.message ?? "")) return byLens;
          throw error;
        }
        if (!data?.length) break;
        for (const row of data as any[]) {
          const entry = byLens.get(row.lens_id) ?? { count: 0, primary: null };
          entry.count += 1;
          if (row.is_primary) entry.primary = row.innovations_alias;
          byLens.set(row.lens_id, entry);
        }
        if (data.length < PAGE) break;
      }
      return byLens;
    },
  });
