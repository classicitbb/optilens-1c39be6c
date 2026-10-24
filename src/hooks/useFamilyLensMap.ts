import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Links an Innova lens family (innovations_store_lenses.innovations_lens_id)
 * to the website lens product it represents. The link is what makes family
 * pricing real: a price typed on the family row is written against the linked
 * lens on the pricelist, which is the row every ordering surface reads.
 *
 * Seeded automatically from matching OPC codes
 * (innovations_store_lens_power_rows.right_opc = store_product_variants.opc_code);
 * staff can correct or add links by hand.
 */
export interface FamilyLensLink {
  id: string;
  innovations_lens_id: string;
  lens_id: string;
  match_source: "auto_opc" | "manual";
  confidence: number;
}

export interface LinkedLensSummary {
  id: string;
  name: string;
  sell_price: number | null;
}

const MAP_KEY = ["innovations-family-lens-map"];

export const useFamilyLensMap = () => {
  const queryClient = useQueryClient();

  const links = useQuery<FamilyLensLink[]>({
    queryKey: MAP_KEY,
    queryFn: async () => {
      const { data, error } = await (supabase.from("innovations_family_lens_map") as any)
        .select("id,innovations_lens_id,lens_id,match_source,confidence");
      if (error) throw error;
      return (data ?? []) as FamilyLensLink[];
    },
  });

  const lensIds = (links.data ?? []).map((l) => l.lens_id);

  const linkedLenses = useQuery<LinkedLensSummary[]>({
    queryKey: ["innovations-family-linked-lenses", [...lensIds].sort().join(",")],
    enabled: lensIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("lenses") as any)
        .select("id,name,sell_price")
        .in("id", lensIds);
      if (error) throw error;
      return (data ?? []) as LinkedLensSummary[];
    },
  });

  const setLink = useMutation({
    mutationFn: async ({ innovationsLensId, lensId }: { innovationsLensId: string; lensId: string }) => {
      const { error } = await (supabase.from("innovations_family_lens_map") as any).upsert(
        {
          innovations_lens_id: innovationsLensId,
          lens_id: lensId,
          match_source: "manual",
          confidence: 1,
        },
        { onConflict: "innovations_lens_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MAP_KEY }),
  });

  const clearLink = useMutation({
    mutationFn: async (innovationsLensId: string) => {
      const { error } = await (supabase.from("innovations_family_lens_map") as any)
        .delete()
        .eq("innovations_lens_id", innovationsLensId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MAP_KEY }),
  });

  const linkByFamily = new Map<string, FamilyLensLink>();
  for (const link of links.data ?? []) linkByFamily.set(link.innovations_lens_id, link);

  const lensById = new Map<string, LinkedLensSummary>();
  for (const lens of linkedLenses.data ?? []) lensById.set(lens.id, lens);

  return {
    linkByFamily,
    lensById,
    isLoading: links.isLoading,
    setLink,
    clearLink,
  };
};
