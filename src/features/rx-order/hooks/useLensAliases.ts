import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LensColourOption } from "../types";

// Colour options for a resolved lens, via confirmed lens_alias_map rows.
// Empty result = mapping not done yet → the Lens step silently skips the
// colour sub-step and submission falls back to the primary alias (never
// blocks ordering — INNOVA_INTEGRATION_ARCHITECTURE.md §2.4).
export const useLensColours = (lensId: string | null) => {
  return useQuery<LensColourOption[]>({
    queryKey: ["lens-colours", lensId],
    enabled: !!lensId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("lens_alias_map") as any)
        .select("innovations_alias, is_primary, innovations_lens_aliases(color_code, color_description, is_active)")
        .eq("lens_id", lensId)
        .not("confirmed_at", "is", null);
      if (error) throw error;
      return (data ?? [])
        .filter((r: any) => r.innovations_lens_aliases?.is_active !== false)
        .map((r: any) => ({
          alias: r.innovations_alias,
          color_code: r.innovations_lens_aliases?.color_code ?? "",
          color_description: r.innovations_lens_aliases?.color_description ?? "",
          is_primary: !!r.is_primary,
        }))
        .sort((a: LensColourOption, b: LensColourOption) =>
          (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.color_description.localeCompare(b.color_description));
    },
    staleTime: 60_000,
  });
};
