import { useState, useCallback } from "react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculatePricingEngine, type PricingEngineInput, type PricingEngineResult } from "./usePricingEngine";
import type { PricingSettings } from "./usePricingSettings";

// ── CSV columns ──
const REQUIRED_COLS = [
  "showinpl", "fulllab", "supplier", "material", "mftype",
  "lenstype", "option", "finishtype", "brand", "uscost", "showinwspl",
] as const;

const ALL_COLS = ["ShowInPL", "FullLab", "Supplier", "Material", "MFType", "LensType", "Option", "FinishType", "Brand", "USCost", "ShowInWSPL"];

const REF_COLUMNS = [
  { col: "supplier", table: "suppliers", key: "supplier_id" },
  { col: "brand", table: "brands", key: "brand_id" },
  { col: "material", table: "materials", key: "material_id" },
  { col: "mftype", table: "mftypes", key: "mftype_id" },
  { col: "lenstype", table: "lenstypes", key: "lenstype_id" },
  { col: "option", table: "lens_options", key: "lens_option_id" },
  { col: "finishtype", table: "finishtypes", key: "finishtype_id" },
] as const;

export type RowStatus = "valid" | "error" | "duplicate" | "imported";
export type DuplicateAction = "overwrite" | "ignore";

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  errors: string[];
  generatedName: string;
  resolved: Record<string, string>;
  existingLensId?: string;
  pricing?: PricingEngineResult | null;
  supplierCost: number;
}

export interface UnresolvedRef {
  col: string;
  table: string;
  originalValue: string;
  resolution: "map" | "create" | null;
  mappedId?: string;
  affectedRows: number;
}

export interface RefOption {
  id: string;
  name: string;
}

export interface ImportSummary {
  total: number;
  valid: number;
  errors: number;
  duplicates: number;
  imported: number;
}

type RefEntry = { id: string; name: string; abbrev?: string };
type RefMap = Map<string, RefEntry>;

async function fetchRefMap(table: string): Promise<RefMap> {
  const { data, error } = await (supabase
    .from(table as any)
    .select("id, name, abbrev, is_active") as any)
    .eq("is_active", true);
  if (error) throw error;
  const map = new Map<string, RefEntry>();
  ((data as any[]) ?? []).forEach((r: any) =>
    map.set(r.name.toLowerCase().trim(), { id: r.id, name: r.name, abbrev: r.abbrev ?? "" })
  );
  return map;
}

/** Load saved mappings from import_ref_mappings and inject into ref maps */
async function loadSavedMappings(maps: Record<string, RefMap>): Promise<void> {
  const { data, error } = await supabase
    .from("import_ref_mappings" as any)
    .select("ref_table, csv_value, mapped_id") as any;
  if (error || !data) return;

  for (const mapping of data as { ref_table: string; csv_value: string; mapped_id: string }[]) {
    const map = maps[mapping.ref_table];
    if (!map) continue;
    const key = mapping.csv_value.toLowerCase().trim();
    if (map.has(key)) continue; // already resolved by direct name match

    // Fetch the actual record to get name/abbrev
    const { data: record } = await (supabase
      .from(mapping.ref_table as any)
      .select("id, name, abbrev") as any)
      .eq("id", mapping.mapped_id)
      .single();
    if (record) {
      map.set(key, { id: (record as any).id, name: (record as any).name, abbrev: (record as any).abbrev ?? "" });
    }
  }
}

/** Persist a mapping to import_ref_mappings (upsert) */
async function persistMapping(refTable: string, csvValue: string, mappedId: string): Promise<void> {
  await supabase.from("import_ref_mappings" as any).upsert(
    { ref_table: refTable, csv_value: csvValue.toLowerCase().trim(), mapped_id: mappedId } as any,
    { onConflict: "ref_table,csv_value" } as any,
  );
}

export async function fetchRefOptions(table: string): Promise<RefOption[]> {
  const { data, error } = await (supabase
    .from(table as any)
    .select("id, name, is_active") as any)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return ((data as any[]) ?? []).map((r: any) => ({ id: r.id, name: r.name }));
}

async function createRefRecord(table: string, name: string): Promise<string> {
  const { data, error } = await supabase
    .from(table as any)
    .insert({ name } as any)
    .select("id")
    .single();
  if (error) throw error;
  return (data as any).id;
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

function generateLensName(
  material?: RefEntry, mftype?: RefEntry, lenstype?: RefEntry, option?: RefEntry,
): string {
  return [material?.abbrev, mftype?.abbrev, lenstype?.name, option?.name]
    .filter(Boolean).join(" ");
}

function computeRowPricing(raw: Record<string, string>, settings: PricingSettings): { pricing: PricingEngineResult | null; supplierCost: number } {
  const cost = cleanNumber(raw["uscost"] ?? "") ?? 0;
  const input: PricingEngineInput = {
    component_type: "lenses",
    supplier_cost: cost,
    currency: "USD",
    bb_item: false,
    vat_recoverable: false,
    duty_applicable: true,
    labour_cost: 0,
    category: "lenses",
  };
  return { pricing: calculatePricingEngine(input, settings), supplierCost: cost };
}

/** Build a composite key for duplicate detection */
function compositeKey(resolved: Record<string, string>): string {
  return [
    resolved.supplier_id ?? "",
    resolved.brand_id ?? "",
    resolved.material_id ?? "",
    resolved.mftype_id ?? "",
    resolved.lenstype_id ?? "",
    resolved.finishtype_id ?? "",
  ].join("|");
}

export const useImportLenses = () => {
  const queryClient = useQueryClient();
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [unresolvedRefs, setUnresolvedRefs] = useState<UnresolvedRef[]>([]);
  const [refMaps, setRefMaps] = useState<Record<string, RefMap>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [duplicateAction, setDuplicateAction] = useState<DuplicateAction>("overwrite");

  const { data: pricingSettings } = useQuery<PricingSettings>({
    queryKey: ["pricing_settings_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_settings").select("*").eq("is_active", true)
        .order("version", { ascending: false }).limit(1).single();
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

  const hasUnresolved = unresolvedRefs.some((u) => u.resolution === null);

  const validateRows = useCallback(
    (
      rawRows: Record<string, string>[],
      maps: Record<string, RefMap>,
      existingCompositeKeys: Map<string, string>,
      settings?: PricingSettings | null,
    ): { parsed: ParsedRow[]; unresolved: UnresolvedRef[] } => {
      const unresolvedMap = new Map<string, UnresolvedRef>();

      const parsed: ParsedRow[] = rawRows.map((raw, i) => {
        const errors: string[] = [];
        const resolved: Record<string, string> = {};
        let resolvedMaterial: RefEntry | undefined;
        let resolvedMftype: RefEntry | undefined;
        let resolvedLenstype: RefEntry | undefined;
        let resolvedOption: RefEntry | undefined;

        for (const { col, table, key } of REF_COLUMNS) {
          const val = raw[col]?.trim();
          if (!val) { errors.push(`${col} is required`); continue; }
          const map = maps[table];
          if (!map) { errors.push(`${col} ref data not loaded`); continue; }
          const entry = map.get(val.toLowerCase());
          if (!entry) {
            const mapKey = `${col}:${val.toLowerCase()}`;
            if (!unresolvedMap.has(mapKey)) {
              unresolvedMap.set(mapKey, { col, table, originalValue: val, resolution: null, affectedRows: 0 });
            }
            unresolvedMap.get(mapKey)!.affectedRows++;
            errors.push(`${col} "${val}" not found`);
          } else {
            resolved[key] = entry.id;
            if (col === "material") resolvedMaterial = entry;
            if (col === "mftype") resolvedMftype = entry;
            if (col === "lenstype") resolvedLenstype = entry;
            if (col === "option") resolvedOption = entry;
          }
        }

        const cost = cleanNumber(raw["uscost"] ?? "");
        if (cost === null) errors.push("USCost must be a number");

        const generatedName = generateLensName(resolvedMaterial, resolvedMftype, resolvedLenstype, resolvedOption);

        // Composite-key duplicate detection
        const key = errors.length === 0 ? compositeKey(resolved) : "";
        const existingId = key ? existingCompositeKeys.get(key) : undefined;
        const status: RowStatus = errors.length > 0 ? "error" : existingId ? "duplicate" : "valid";

        let pricing: PricingEngineResult | null = null;
        let supplierCost = 0;
        if (settings && errors.length === 0) {
          const computed = computeRowPricing(raw, settings);
          pricing = computed.pricing;
          supplierCost = computed.supplierCost;
        }

        return { rowNumber: i + 1, raw, status, errors, generatedName, resolved, existingLensId: existingId, pricing, supplierCost };
      });

      return { parsed, unresolved: Array.from(unresolvedMap.values()) };
    },
    [],
  );

  /** Fetch existing lenses and build composite key map */
  const fetchExistingCompositeKeys = useCallback(async (): Promise<Map<string, string>> => {
    const { data } = await supabase
      .from("lenses")
      .select("id, supplier_id, brand_id, material_id, mftype_id, lenstype_id, finishtype_id");
    const map = new Map<string, string>();
    ((data as any[]) ?? []).forEach((l: any) => {
      const key = [
        l.supplier_id ?? "", l.brand_id ?? "", l.material_id ?? "",
        l.mftype_id ?? "", l.lenstype_id ?? "", l.finishtype_id ?? "",
      ].join("|");
      map.set(key, l.id);
    });
    return map;
  }, []);

  const parseAndValidate = useCallback(async (file: File) => {
    setIsValidating(true);
    setFileName(file.name);
    setBatchId(null);
    setUnresolvedRefs([]);

    try {
      const text = await file.text();
      const rawRows = parseCSVText(text);
      setRawData(rawRows);

      if (rawRows.length === 0) { setRows([]); setIsValidating(false); return; }

      const headers = Object.keys(rawRows[0]).map((h) => h.toLowerCase());
      const missingHeaders = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missingHeaders.length > 0) {
        setRows([{
          rowNumber: 0, raw: {}, status: "error", generatedName: "",
          errors: [`Missing required columns: ${missingHeaders.join(", ")}`],
          resolved: {}, supplierCost: 0,
        }]);
        setIsValidating(false);
        return;
      }

      const maps: Record<string, RefMap> = {};
      await Promise.all(REF_COLUMNS.map(async ({ table }) => { maps[table] = await fetchRefMap(table); }));

      // Load saved mappings and inject into ref maps
      await loadSavedMappings(maps);
      setRefMaps(maps);

      const existingCompositeKeys = await fetchExistingCompositeKeys();

      let settings = pricingSettings;
      if (!settings) {
        const { data } = await supabase
          .from("pricing_settings").select("*").eq("is_active", true)
          .order("version", { ascending: false }).limit(1).single();
        settings = data as unknown as PricingSettings;
      }

      const { parsed, unresolved } = validateRows(rawRows, maps, existingCompositeKeys, settings);
      setRows(parsed);
      setUnresolvedRefs(unresolved);
    } catch (err: any) {
      setRows([{
        rowNumber: 0, raw: {}, status: "error", generatedName: "",
        errors: [err.message || "Failed to parse file"], resolved: {}, supplierCost: 0,
      }]);
    } finally {
      setIsValidating(false);
    }
  }, [validateRows, pricingSettings, fetchExistingCompositeKeys]);

  const resolveRef = useCallback(async (index: number, action: "map" | "create", mappedId?: string) => {
    const ref = unresolvedRefs[index];
    if (!ref) return;

    let resolvedId = mappedId;
    if (action === "create") {
      resolvedId = await createRefRecord(ref.table, ref.originalValue);
    }
    if (!resolvedId) return;

    // Persist mapping to database for future imports
    await persistMapping(ref.table, ref.originalValue, resolvedId);

    const updatedMaps = { ...refMaps };
    const map = new Map(updatedMaps[ref.table]);
    const { data } = await (supabase.from(ref.table as any).select("id, name, abbrev") as any).eq("id", resolvedId).single();
    if (data) {
      map.set(ref.originalValue.toLowerCase().trim(), {
        id: (data as any).id, name: (data as any).name, abbrev: (data as any).abbrev ?? "",
      });
    }
    updatedMaps[ref.table] = map;
    setRefMaps(updatedMaps);

    const updatedRefs = [...unresolvedRefs];
    updatedRefs[index] = { ...ref, resolution: action, mappedId: resolvedId };
    setUnresolvedRefs(updatedRefs);

    const existingCompositeKeys = await fetchExistingCompositeKeys();

    const { parsed, unresolved } = validateRows(rawData, updatedMaps, existingCompositeKeys, pricingSettings);
    setRows(parsed);

    const resolvedKeys = new Set(
      updatedRefs.filter((r) => r.resolution !== null).map((r) => `${r.col}:${r.originalValue.toLowerCase()}`),
    );
    const merged = [
      ...updatedRefs.filter((r) => r.resolution !== null),
      ...unresolved.filter((u) => !resolvedKeys.has(`${u.col}:${u.originalValue.toLowerCase()}`)),
    ];
    setUnresolvedRefs(merged);
  }, [unresolvedRefs, refMaps, rawData, validateRows, pricingSettings, fetchExistingCompositeKeys]);

  const executeImport = useCallback(async () => {
    const importable = rows.filter((r) => {
      if (r.status === "valid") return true;
      if (r.status === "duplicate") return duplicateAction === "overwrite";
      return false;
    });
    if (importable.length === 0) return;
    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: batch, error: batchErr } = await supabase
        .from("import_batches")
        .insert({ user_id: user.id, file_name: fileName ?? "unknown.csv", status: "processing", total_rows: importable.length } as any)
        .select("id").single();
      if (batchErr) throw batchErr;
      setBatchId(batch.id);

      let successCount = 0;
      let errorCount = 0;
      const updatedRows = [...rows];

      for (const row of importable) {
        try {
          const raw = row.raw;
          const cost = cleanNumber(raw["uscost"] ?? "") ?? 0;
          const lensData = {
            name: row.generatedName,
            supplier_id: row.resolved.supplier_id!,
            brand_id: row.resolved.brand_id!,
            material_id: row.resolved.material_id!,
            mftype_id: row.resolved.mftype_id!,
            lenstype_id: row.resolved.lenstype_id!,
            finishtype_id: row.resolved.finishtype_id || null,
            index_value: 1.5,
            base_price: cost,
            sell_price: 0,
            sph_min: -6, sph_max: 6, cyl_min: -4, cyl_max: 0,
            add_min: null, add_max: null,
            show_in_pricelist: parseBool(raw["showinpl"] ?? ""),
            full_lab: parseBool(raw["fulllab"] ?? ""),
            show_in_ws_pricelist: parseBool(raw["showinwspl"] ?? ""),
            show_on_website: false, notes: null, is_active: true,
          };

          let lensId: string;
          if (row.existingLensId) {
            const { error } = await supabase.from("lenses").update(lensData as any).eq("id", row.existingLensId);
            if (error) throw error;
            lensId = row.existingLensId;
          } else {
            const { data: newLens, error } = await supabase.from("lenses").insert(lensData as any).select("id").single();
            if (error) throw error;
            lensId = newLens.id;
          }

          await supabase.from("lens_lens_options").delete().eq("lens_id", lensId);
          if (row.resolved.lens_option_id) {
            await supabase.from("lens_lens_options").insert({
              lens_id: lensId, lens_option_id: row.resolved.lens_option_id, extra_cost: 0,
            } as any);
          }

          await supabase.from("pricing_input_rows").insert({
            batch_id: batch.id, row_number: row.rowNumber,
            raw_data: raw, status: "imported",
            resolved_data: { lens_id: lensId }, lens_id: lensId,
          } as any);

          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "imported" };
          successCount++;
        } catch (err: any) {
          try {
            await supabase.from("pricing_input_rows").insert({
              batch_id: batch.id, row_number: row.rowNumber,
              raw_data: row.raw, status: "error",
              error_messages: [err.message || "Unknown error"],
            } as any);
          } catch { /* ignore */ }

          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) {
            updatedRows[idx] = {
              ...updatedRows[idx], status: "error",
              errors: [...updatedRows[idx].errors, err.message || "Import failed"],
            };
          }
          errorCount++;
        }
      }

      setRows(updatedRows);
      await supabase.from("import_batches").update({
        status: "completed", success_count: successCount, error_count: errorCount,
      } as any).eq("id", batch.id);

      queryClient.invalidateQueries({ queryKey: ["lenses"] });
    } catch (err: any) {
      console.error("Import failed:", err);
    } finally {
      setIsImporting(false);
    }
  }, [rows, fileName, duplicateAction]);

  const reset = useCallback(() => {
    setRows([]); setRawData([]); setUnresolvedRefs([]); setRefMaps({});
    setBatchId(null); setFileName(null); setDuplicateAction("overwrite");
  }, []);

  const generateTemplate = useCallback(() => {
    const csv = ALL_COLS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "lens_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    rows, summary, unresolvedRefs, hasUnresolved,
    isValidating, isImporting, batchId, fileName,
    duplicateAction, setDuplicateAction,
    parseAndValidate, resolveRef, executeImport, reset, generateTemplate,
  };
};
