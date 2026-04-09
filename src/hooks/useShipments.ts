import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeShipmentDerivedTotals } from "@/lib/importCostings";

export interface Shipment {
  id: string;
  type: "lens" | "non-lens";
  supplier_id: string;
  commodity: string;
  date_ordered: string | null;
  po_ref: string;
  date_received: string;
  invoice_number: string;
  invoice_date: string;
  currency: string;
  exchange_rate: number;
  fob_foreign: number;
  invoice_total_foreign: number;
  freight_provider?: "dhl" | "non-dhl";
  status: "draft" | "reviewed" | "locked";
  version: number;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  supplier_name?: string;
}

export interface ShipmentCharge {
  id: string;
  shipment_id: string;
  charge_type: string;
  amount_bbd: number;
  vat_bbd: number;
  duty_bbd: number;
  vat_reclaimable: boolean;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ShipmentLine {
  id: string;
  shipment_id: string;
  product_type: "lens" | "supply" | "addon" | "free";
  lens_id: string | null;
  supply_id: string | null;
  addon_id: string | null;
  description: string;
  quantity: number;
  unit_fob_foreign: number;
  line_fob_foreign: number;
  markup_percent: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ShipmentFormData = Omit<Shipment, "id" | "created_at" | "updated_at" | "supplier_name">;

export const CHARGE_TYPES = [
  "Shipping Charge",
  "Landing Charge",
  "Duties & VAT",
  "Brokerage",
  "Local Freight",
  "Courier Charges",
  "Bank Expenses (Card Payment)",
  "Miscellaneous",
  "Storage Cost",
] as const;

export const useShipments = (typeFilter?: "lens" | "non-lens") => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["shipments", typeFilter],
    queryFn: async () => {
      let q = supabase
        .from("shipments" as any)
        .select("*, suppliers(name)")
        .order("created_at", { ascending: false });
      if (typeFilter) q = q.eq("type", typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        ...d,
        supplier_name: d.suppliers?.name ?? "",
      })) as Shipment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: Partial<ShipmentFormData>) => {
      const { data, error } = await (supabase.from("shipments") as any)
        .insert({ ...form, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipments"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: { id: string } & Partial<ShipmentFormData>) => {
      const { error } = await (supabase.from("shipments") as any)
        .update(form)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("shipments") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipments"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useAllShipmentCharges = () => useQuery({
  queryKey: ["shipment-charges-all"],
  queryFn: async () => {
    const { data, error } = await (supabase.from("shipment_charges") as any)
      .select("*");
    if (error) throw error;
    return (data ?? []) as ShipmentCharge[];
  },
});

export const useShipmentCharges = (shipmentId: string | null) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["shipment-charges", shipmentId],
    enabled: !!shipmentId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("shipment_charges") as any)
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ShipmentCharge[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (charge: Partial<ShipmentCharge>) => {
      if (charge.id) {
        const { id, ...rest } = charge;
        const { error } = await (supabase.from("shipment_charges") as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("shipment_charges") as any).insert(charge);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment-charges", shipmentId] });
      qc.invalidateQueries({ queryKey: ["shipment-charges-all"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("shipment_charges") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipment-charges", shipmentId] });
      qc.invalidateQueries({ queryKey: ["shipment-charges-all"] });
    },
  });

  return { ...query, upsertMutation, deleteMutation };
};

export const useShipmentLines = (shipmentId: string | null) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["shipment-lines", shipmentId],
    enabled: !!shipmentId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("shipment_lines") as any)
        .select("*")
        .eq("shipment_id", shipmentId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ShipmentLine[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (line: Partial<ShipmentLine>) => {
      if (line.id) {
        const { id, ...rest } = line;
        const { error } = await (supabase.from("shipment_lines") as any).update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("shipment_lines") as any).insert(line);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipment-lines", shipmentId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("shipment_lines") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipment-lines", shipmentId] }),
  });

  return { ...query, upsertMutation, deleteMutation };
};

/** Compute shipment derived values */
export const computeShipmentTotals = (
  shipment: Pick<Shipment, "currency" | "exchange_rate" | "fob_foreign" | "invoice_total_foreign" | "freight_provider">,
  charges: ShipmentCharge[],
  settings?: { fx_rates?: Record<string, number> | null } | null
) => computeShipmentDerivedTotals(shipment, charges, settings);

export const computeLineCosts = (
  line: Pick<ShipmentLine, "line_fob_foreign" | "quantity" | "markup_percent">,
  xr: number,
  multiplier: number
) => {
  const lineFobBbd = line.line_fob_foreign * xr;
  const landedLineBbd = lineFobBbd * multiplier;
  const landedUnitBbd = line.quantity > 0 ? landedLineBbd / line.quantity : 0;
  const landedUnitUsd = xr > 0 ? landedUnitBbd / xr : 0;
  const markup = (line.markup_percent || 0) / 100;
  const sellBbd = landedUnitBbd * (1 + markup);
  const sellUsd = xr > 0 ? sellBbd / xr : 0;
  return { lineFobBbd, landedLineBbd, landedUnitBbd, landedUnitUsd, sellBbd, sellUsd };
};
