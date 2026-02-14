import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LensOption {
  lens_option_id: string;
  extra_cost: number;
  lens_option: { name: string } | null;
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
  supplier: { name: string } | null;
  brand: { name: string } | null;
  material: { name: string } | null;
  mftype: { name: string } | null;
  lenstype: { name: string } | null;
  finishtype: { name: string } | null;
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

const SELECT_QUERY = `*, supplier:suppliers(name), brand:brands(name), material:materials(name), mftype:mftypes(name), lenstype:lenstypes(name), finishtype:finishtypes(name), lens_lens_options(lens_option_id, extra_cost, lens_option:lens_options(name))`;

export const useLenses = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Lens[]>({
    queryKey: ["lenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lenses")
        .select(SELECT_QUERY)
        .order("name");
      if (error) throw error;
      return data as unknown as Lens[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: LensFormData) => {
      const { option, ...lensData } = form;
      const { data, error } = await supabase
        .from("lenses")
        .insert(lensData as any)
        .select("id")
        .single();
      if (error) throw error;
      if (option) {
        const { error: optErr } = await supabase.from("lens_lens_options").insert({ lens_id: data.id, lens_option_id: option.lens_option_id, extra_cost: option.extra_cost } as any);
        if (optErr) throw optErr;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: LensFormData }) => {
      const { option, ...lensData } = form;
      const { error } = await supabase
        .from("lenses")
        .update(lensData as any)
        .eq("id", id);
      if (error) throw error;
      // Replace option
      const { error: delErr } = await supabase.from("lens_lens_options").delete().eq("lens_id", id);
      if (delErr) throw delErr;
      if (option) {
        const { error: optErr } = await supabase.from("lens_lens_options").insert({ lens_id: id, lens_option_id: option.lens_option_id, extra_cost: option.extra_cost } as any);
        if (optErr) throw optErr;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("lenses").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete join rows first to be safe
      const { error: joinErr } = await supabase.from("lens_lens_options").delete().eq("lens_id", id);
      if (joinErr) throw joinErr;
      const { error } = await supabase.from("lenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (lens: Lens) => {
      const { id, created_at, updated_at, supplier, brand, material, mftype, lenstype, finishtype, lens_lens_options, ...rest } = lens;
      const newLens = { ...rest, name: `${lens.name} (Copy)` };
      const { data, error } = await supabase.from("lenses").insert(newLens as any).select("id").single();
      if (error) throw error;
      // Duplicate lens options
      if (lens_lens_options?.length) {
        const optRows = lens_lens_options.map((o) => ({ lens_id: data.id, lens_option_id: o.lens_option_id, extra_cost: o.extra_cost }));
        const { error: optErr } = await supabase.from("lens_lens_options").insert(optRows as any);
        if (optErr) throw optErr;
      }
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lenses"] }),
  });

  return { ...query, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation };
};
