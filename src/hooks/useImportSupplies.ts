import { useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculatePricingEngine, type PricingEngineInput, type PricingEngineResult } from "./usePricingEngine";
import type { PricingSettings } from "./usePricingSettings";

const REQUIRED_COLS = ["name"] as const;
const ALL_COLS = [
  "Name", "SKU", "Category", "Description", "Detail", "Bin", "Unit",
  "QuantityPerUnit", "Supplier", "Brand", "BaseCost", "SellPrice", "Currency",
  "DutyAdded", "VatPaid", "LabourAdded", "Stocked", "Preferred", "BBItem",
  "ShowInPricelist", "StkWSPL", "ShowOnWebsite",
];

export type RowStatus = "valid" | "error" | "duplicate" | "imported";

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  errors: string[];
  existingId?: string;
  pricing?: PricingEngineResult | null;
  supplierCost: number;
}

export interface ImportSummary {
  total: number;
  valid: number;
  errors: number;
  duplicates: number;
  imported: number;
}

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.toLowerCase()] = values[i] ?? "";
      row[h] = values[i] ?? "";
    });
    return row;
  });
}

function cleanNumber(v: string): number | null {
  const cleaned = v.replace(/[$,\s]/g, "").trim();
  if (cleaned === "" || isNaN(Number(cleaned))) return null;
  return Number(cleaned);
}

function parseBool(v: string): boolean {
  const lower = v.toLowerCase().trim();
  return lower === "true" || lower === "1" || lower === "yes" || lower === "y" || lower === "x";
}

function computeRowPricing(raw: Record<string, string>, settings: PricingSettings): { pricing: PricingEngineResult | null; supplierCost: number } {
  const baseCost = cleanNumber(raw["basecost"] ?? "") ?? 0;
  const sellPrice = cleanNumber(raw["sellprice"] ?? "") ?? 0;
  const currency = raw["currency"]?.trim() || "USD";
  const bbItem = parseBool(raw["bbitem"] ?? "");
  const dutyAdded = parseBool(raw["dutyadded"] ?? "");

  const input: PricingEngineInput = {
    component_type: "supplies",
    supplier_cost: baseCost,
    currency,
    bb_item: bbItem,
    vat_recoverable: false,
    duty_applicable: dutyAdded,
    labour_cost: 0,
    category: "supplies",
    sell_price: sellPrice > 0 ? sellPrice : undefined,
  };

  return { pricing: calculatePricingEngine(input, settings), supplierCost: baseCost };
}

export const useImportSupplies = () => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const { data: pricingSettings } = useQuery<PricingSettings>({
    queryKey: ["pricing_settings_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings")
        .select("*")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as PricingSettings;
    },
  });

  const summary: ImportSummary = {
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    errors: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    imported: rows.filter((r) => r.status === "imported").length,
  };

  const parseAndValidate = useCallback(async (file: File) => {
    setIsValidating(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      const rawRows = parseCSVText(text);
      if (rawRows.length === 0) { setRows([]); setIsValidating(false); return; }

      const headers = Object.keys(rawRows[0]).map((h) => h.toLowerCase());
      const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        setRows([{ rowNumber: 0, raw: {}, status: "error", errors: [`Missing required columns: ${missing.join(", ")}`], supplierCost: 0 }]);
        setIsValidating(false);
        return;
      }

      const { data: existing } = await (supabase.from("supplies") as any).select("id, name");
      const nameMap = new Map<string, string>();
      ((existing as any[]) ?? []).forEach((s: any) => nameMap.set(s.name.toLowerCase().trim(), s.id));

      // Fetch active pricing settings for computation
      let settings = pricingSettings;
      if (!settings) {
        const { data } = await supabase
          .from("pricing_settings").select("*").eq("is_active", true)
          .order("version", { ascending: false }).limit(1).single();
        settings = data as unknown as PricingSettings;
      }

      const parsed: ParsedRow[] = rawRows.map((raw, i) => {
        const errors: string[] = [];
        const name = raw["name"]?.trim();
        if (!name) errors.push("Name is required");

        const existingId = name ? nameMap.get(name.toLowerCase()) : undefined;
        const status: RowStatus = errors.length > 0 ? "error" : existingId ? "duplicate" : "valid";

        let pricing: PricingEngineResult | null = null;
        let supplierCost = 0;
        if (settings && errors.length === 0) {
          const computed = computeRowPricing(raw, settings);
          pricing = computed.pricing;
          supplierCost = computed.supplierCost;
        }

        return { rowNumber: i + 1, raw, status, errors, existingId, pricing, supplierCost };
      });

      setRows(parsed);
    } catch (err: any) {
      setRows([{ rowNumber: 0, raw: {}, status: "error", errors: [err.message || "Failed to parse file"], supplierCost: 0 }]);
    } finally {
      setIsValidating(false);
    }
  }, [pricingSettings]);

  const executeImport = useCallback(async () => {
    const importable = rows.filter((r) => r.status === "valid" || r.status === "duplicate");
    if (importable.length === 0) return;
    setIsImporting(true);

    try {
      const { data: suppliers } = await (supabase.from("suppliers") as any).select("id, name").eq("is_active", true);
      const supplierMap = new Map<string, string>();
      ((suppliers as any[]) ?? []).forEach((s: any) => supplierMap.set(s.name.toLowerCase().trim(), s.id));

      const { data: brands } = await (supabase.from("brands") as any).select("id, name").eq("is_active", true);
      const brandMap = new Map<string, string>();
      ((brands as any[]) ?? []).forEach((b: any) => brandMap.set(b.name.toLowerCase().trim(), b.id));

      const updatedRows = [...rows];

      for (const row of importable) {
        try {
          const raw = row.raw;
          const supplierName = (raw["supplier"] ?? "").trim().toLowerCase();
          const brandName = (raw["brand"] ?? "").trim().toLowerCase();

          const data: any = {
            name: raw["name"]?.trim(),
            sku: raw["sku"]?.trim() || null,
            category: raw["category"]?.trim() || "Sundry",
            description: raw["description"]?.trim() || "",
            detail: raw["detail"]?.trim() || "",
            bin: raw["bin"]?.trim() || "",
            unit: raw["unit"]?.trim() || "each",
            quantity_per_unit: cleanNumber(raw["quantityperunit"] ?? "") ?? 1,
            base_price: cleanNumber(raw["basecost"] ?? "") ?? 0,
            sell_price: cleanNumber(raw["sellprice"] ?? "") ?? 0,
            currency: raw["currency"]?.trim() || "USD",
            duty_added: parseBool(raw["dutyadded"] ?? ""),
            vat_paid: parseBool(raw["vatpaid"] ?? ""),
            labour_added: parseBool(raw["labouradded"] ?? ""),
            stocked: parseBool(raw["stocked"] ?? ""),
            preferred: parseBool(raw["preferred"] ?? ""),
            bb_item: parseBool(raw["bbitem"] ?? ""),
            show_in_pricelist: parseBool(raw["showinpricelist"] ?? ""),
            stk_wspl: parseBool(raw["stkwspl"] ?? ""),
            show_on_website: parseBool(raw["showonwebsite"] ?? ""),
            supplier_id: supplierName ? supplierMap.get(supplierName) ?? null : null,
            brand_id: brandName ? brandMap.get(brandName) ?? null : null,
          };

          if (row.existingId) {
            await (supabase.from("supplies") as any).update(data).eq("id", row.existingId);
          } else {
            await (supabase.from("supplies") as any).insert(data);
          }

          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "imported" };
        } catch (err: any) {
          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "error", errors: [...updatedRows[idx].errors, err.message] };
        }
      }

      setRows(updatedRows);
      queryClient.invalidateQueries({ queryKey: ["supplies"] });
    } finally {
      setIsImporting(false);
    }
  }, [rows, queryClient]);

  const reset = useCallback(() => { setRows([]); setFileName(null); }, []);

  const generateTemplate = useCallback(() => {
    const csv = ALL_COLS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "supplies_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { rows, summary, isValidating, isImporting, fileName, parseAndValidate, executeImport, reset, generateTemplate };
};
