import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RefFK {
  name: string;
  abbrev?: string;
}

export interface LensOption {
  lens_option_id: string;
  extra_cost: number;
  lens_option: RefFK | null;
}

export interface Lens {
  id: string;
  name: string;
  supplier_id: string;
  brand_id: string;
  material_id: string;
  mftype_id: string;
  lenstype_id: string;
  finishtype_id: string | null;
  index_value: number;
  base_price: number;
  sell_price: number;
  sph_min: number;
  sph_max: number;
  cyl_min: number;
  cyl_max: number;
  add_min: number | null;
  add_max: number | null;
  is_active: boolean;
  show_in_pricelist: boolean;
  full_lab: boolean;
  show_in_ws_pricelist: boolean;
  show_on_website: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  supplier: RefFK | null;
  brand: RefFK | null;
  material: RefFK | null;
  mftype: RefFK | null;
  lenstype: RefFK | null;
  finishtype: RefFK | null;
  lens_lens_options: LensOption[];
}

export interface LensFormData {
  name: string;
  supplier_id: string;
  brand_id: string;
  material_id: string;
  mftype_id: string;
  lenstype_id: string;
  finishtype_id: string | null;
  index_value: number;
  base_price: number;
  sell_price: number;
  sph_min: number;
  sph_max: number;
  cyl_min: number;
  cyl_max: number;
  add_min: number | null;
  add_max: number | null;
  is_active: boolean;
  show_in_pricelist: boolean;
  full_lab: boolean;
  show_in_ws_pricelist: boolean;
  show_on_website: boolean;
  notes: string | null;
  option: { lens_option_id: string; extra_cost: number } | null;
}

const SELECT_QUERY = `*, supplier:suppliers(name,abbrev), brand:brands(name,abbrev), material:materials(name,abbrev), mftype:mftypes(name,abbrev), lenstype:lenstypes(name,abbrev), finishtype:finishtypes(name,abbrev), lens_lens_options(lens_option_id, extra_cost, lens_option:lens_options(name,abbrev))`;

export const useLenses = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Lens[]>({
    queryKey: ["lenses"],
    queryFn: async () => {
      // Use server-side safe RPC that strips base_price for viewer/customer roles
      const { data: lensRows, error } = await (supabase.rpc as any)("get_lenses_safe");
      if (error) throw error;
      if (!lensRows || (lensRows as any[]).length === 0) return [];
      // Fetch related data for joined fields
      // Fetch ALL rows – the default Supabase limit is 1000 which truncates
      // lenses that sort late alphabetically (e.g. POLY…).
      const PAGE = 1000;
      let allJoined: any[] = [];
      let from = 0;
      while (true) {
        const { data: page, error: pageErr } = await (supabase.from("lenses") as any)
          .select(SELECT_QUERY)
          .order("name")
          .range(from, from + PAGE - 1);
        if (pageErr) throw pageErr;
        if (!page || page.length === 0) break;
        allJoined = allJoined.concat(page);
        if (page.length < PAGE) break;
        from += PAGE;
      }
      const joinedData = allJoined;
      // errors handled per-page above
      // Merge: use base_price from safe RPC, rest from joined query
      const safeMap = new Map((lensRows as any[]).map((r: any) => [r.id, r.base_price]));
      return (joinedData as unknown as Lens[]).map((l) => ({
        ...l,
        base_price: safeMap.has(l.id) ? safeMap.get(l.id) : l.base_price,
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: LensFormData) => {
      const { option, ...lensData } = form;
      const { data, error } = await (supabase.from("lenses") as any)
        .insert(lensData as any)
        .select("id")
        .single();
      if (error) throw error;
      if (option) {
        const { error: optErr } = await (supabase.from("lens_lens_options") as any).insert({ lens_id: data.id, lens_option_id: option.lens_option_id, extra_cost: option.extra_cost } as any);
        if (optErr) throw optErr;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: LensFormData }) => {
      const { option, ...lensData } = form;
      const { error } = await (supabase.from("lenses") as any)
        .update(lensData as any)
        .eq("id", id);
      if (error) throw error;
      // Replace option
      const { error: delErr } = await (supabase.from("lens_lens_options") as any).delete().eq("lens_id", id);
      if (delErr) throw delErr;
      if (option) {
        const { error: optErr } = await (supabase.from("lens_lens_options") as any).insert({ lens_id: id, lens_option_id: option.lens_option_id, extra_cost: option.extra_cost } as any);
        if (optErr) throw optErr;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("lenses") as any).update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete join rows first to be safe
      const { error: joinErr } = await (supabase.from("lens_lens_options") as any).delete().eq("lens_id", id);
      if (joinErr) throw joinErr;
      const { error } = await (supabase.from("lenses") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (lens: Lens) => {
      const { id, created_at, updated_at, supplier, brand, material, mftype, lenstype, finishtype, lens_lens_options, ...rest } = lens;
      const newLens = { ...rest, name: `${lens.name} (Copy)` };
      const { data, error } = await (supabase.from("lenses") as any).insert(newLens as any).select("id").single();
      if (error) throw error;
      // Duplicate lens options
      if (lens_lens_options?.length) {
        const optRows = lens_lens_options.map((o) => ({ lens_id: data.id, lens_option_id: o.lens_option_id, extra_cost: o.extra_cost }));
        const { error: optErr } = await (supabase.from("lens_lens_options") as any).insert(optRows as any);
        if (optErr) throw optErr;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  return { ...query, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation };
};
