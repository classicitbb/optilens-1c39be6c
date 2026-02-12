import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  errors: string[];
  generatedName: string;
  resolved: Record<string, string>; // key like "supplier_id" → uuid
  existingLensId?: string;
}

export interface UnresolvedRef {
  col: string;       // e.g. "supplier"
  table: string;     // e.g. "suppliers"
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

/** Strip $, commas, whitespace and parse as number */
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

  const summary: ImportSummary = {
    total: rows.length,
    valid: rows.filter((r) => r.status === "valid").length,
    errors: rows.filter((r) => r.status === "error").length,
    duplicates: rows.filter((r) => r.status === "duplicate").length,
    imported: rows.filter((r) => r.status === "imported").length,
  };

  const hasUnresolved = unresolvedRefs.some((u) => u.resolution === null);

  /** Core validation logic — used on initial parse and after resolutions */
  const validateRows = useCallback(
    (
      rawRows: Record<string, string>[],
      maps: Record<string, RefMap>,
      lensMap: Map<string, string>,
    ): { parsed: ParsedRow[]; unresolved: UnresolvedRef[] } => {
      const unresolvedMap = new Map<string, UnresolvedRef>(); // "col:value" → ref

      const parsed: ParsedRow[] = rawRows.map((raw, i) => {
        const errors: string[] = [];
        const resolved: Record<string, string> = {};
        let resolvedMaterial: RefEntry | undefined;
        let resolvedMftype: RefEntry | undefined;
        let resolvedLenstype: RefEntry | undefined;
        let resolvedOption: RefEntry | undefined;

        for (const { col, table, key } of REF_COLUMNS) {
          const val = raw[col]?.trim();
          if (!val) {
            errors.push(`${col} is required`);
            continue;
          }
          const map = maps[table];
          if (!map) { errors.push(`${col} ref data not loaded`); continue; }
          const entry = map.get(val.toLowerCase());
          if (!entry) {
            const mapKey = `${col}:${val.toLowerCase()}`;
            if (!unresolvedMap.has(mapKey)) {
              unresolvedMap.set(mapKey, {
                col, table, originalValue: val,
                resolution: null, affectedRows: 0,
              });
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

        // Validate USCost
        const cost = cleanNumber(raw["uscost"] ?? "");
        if (cost === null) errors.push("USCost must be a number");

        const generatedName = generateLensName(resolvedMaterial, resolvedMftype, resolvedLenstype, resolvedOption);
        const existingId = generatedName ? lensMap.get(generatedName.toLowerCase().trim()) : undefined;
        const status: RowStatus = errors.length > 0 ? "error" : existingId ? "duplicate" : "valid";

        return { rowNumber: i + 1, raw, status, errors, generatedName, resolved, existingLensId: existingId };
      });

      return { parsed, unresolved: Array.from(unresolvedMap.values()) };
    },
    [],
  );

  const parseAndValidate = useCallback(async (file: File) => {
    setIsValidating(true);
    setFileName(file.name);
    setBatchId(null);
    setUnresolvedRefs([]);

    try {
      const text = await file.text();
      const rawRows = parseCSVText(text);
      setRawData(rawRows);

      if (rawRows.length === 0) {
        setRows([]);
        setIsValidating(false);
        return;
      }

      // Check headers
      const headers = Object.keys(rawRows[0]).map((h) => h.toLowerCase());
      const missingHeaders = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missingHeaders.length > 0) {
        setRows([{
          rowNumber: 0, raw: {}, status: "error", generatedName: "",
          errors: [`Missing required columns: ${missingHeaders.join(", ")}`],
          resolved: {},
        }]);
        setIsValidating(false);
        return;
      }

      // Fetch all reference data
      const maps: Record<string, RefMap> = {};
      await Promise.all(
        REF_COLUMNS.map(async ({ table }) => {
          maps[table] = await fetchRefMap(table);
        }),
      );
      setRefMaps(maps);

      // Fetch existing lenses
      const { data: existingLenses } = await supabase.from("lenses").select("id, name");
      const lensMap = new Map<string, string>();
      ((existingLenses as any[]) ?? []).forEach((l: any) => lensMap.set(l.name.toLowerCase().trim(), l.id));

      const { parsed, unresolved } = validateRows(rawRows, maps, lensMap);
      setRows(parsed);
      setUnresolvedRefs(unresolved);
    } catch (err: any) {
      setRows([{
        rowNumber: 0, raw: {}, status: "error", generatedName: "",
        errors: [err.message || "Failed to parse file"], resolved: {},
      }]);
    } finally {
      setIsValidating(false);
    }
  }, [validateRows]);

  /** Resolve a single unresolved ref — either map to existing ID or create new */
  const resolveRef = useCallback(async (
    index: number,
    action: "map" | "create",
    mappedId?: string,
  ) => {
    const ref = unresolvedRefs[index];
    if (!ref) return;

    let resolvedId = mappedId;
    if (action === "create") {
      resolvedId = await createRefRecord(ref.table, ref.originalValue);
    }
    if (!resolvedId) return;

    // Update ref maps with the new mapping
    const updatedMaps = { ...refMaps };
    const map = new Map(updatedMaps[ref.table]);
    // Fetch the full entry for name generation
    const { data } = await (supabase.from(ref.table as any).select("id, name, abbrev") as any).eq("id", resolvedId).single();
    if (data) {
      map.set(ref.originalValue.toLowerCase().trim(), {
        id: (data as any).id,
        name: (data as any).name,
        abbrev: (data as any).abbrev ?? "",
      });
    }
    updatedMaps[ref.table] = map;
    setRefMaps(updatedMaps);

    // Update unresolved refs
    const updatedRefs = [...unresolvedRefs];
    updatedRefs[index] = { ...ref, resolution: action, mappedId: resolvedId };
    setUnresolvedRefs(updatedRefs);

    // Re-validate all rows with updated maps
    const { data: existingLenses } = await supabase.from("lenses").select("id, name");
    const lensMap = new Map<string, string>();
    ((existingLenses as any[]) ?? []).forEach((l: any) => lensMap.set(l.name.toLowerCase().trim(), l.id));

    const { parsed, unresolved } = validateRows(rawData, updatedMaps, lensMap);
    setRows(parsed);

    // Merge: keep resolved ones resolved, add any newly found unresolved
    const resolvedKeys = new Set(
      updatedRefs.filter((r) => r.resolution !== null).map((r) => `${r.col}:${r.originalValue.toLowerCase()}`),
    );
    const merged = [
      ...updatedRefs.filter((r) => r.resolution !== null),
      ...unresolved.filter((u) => !resolvedKeys.has(`${u.col}:${u.originalValue.toLowerCase()}`)),
    ];
    setUnresolvedRefs(merged);
  }, [unresolvedRefs, refMaps, rawData, validateRows]);

  const executeImport = useCallback(async () => {
    const importable = rows.filter((r) => r.status === "valid" || r.status === "duplicate");
    if (importable.length === 0) return;

    setIsImporting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: batch, error: batchErr } = await supabase
        .from("import_batches")
        .insert({
          user_id: user.id,
          file_name: fileName ?? "unknown.csv",
          status: "processing",
          total_rows: importable.length,
        } as any)
        .select("id")
        .single();
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
            index_value: 1.5,
            base_price: cost,
            sell_price: 0,
            sph_min: -6, sph_max: 6, cyl_min: -4, cyl_max: 0,
            add_min: null, add_max: null,
            show_in_pricelist: parseBool(raw["showinpl"] ?? ""),
            full_lab: parseBool(raw["fulllab"] ?? ""),
            show_in_ws_pricelist: parseBool(raw["showinwspl"] ?? ""),
            show_on_website: false,
            notes: null,
            is_active: true,
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

          // Handle lens_option
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

      // Invalidate lens catalog cache so new imports appear immediately
      queryClient.invalidateQueries({ queryKey: ["lenses"] });
    } catch (err: any) {
      console.error("Import failed:", err);
    } finally {
      setIsImporting(false);
    }
  }, [rows, fileName]);

  const reset = useCallback(() => {
    setRows([]);
    setRawData([]);
    setUnresolvedRefs([]);
    setRefMaps({});
    setBatchId(null);
    setFileName(null);
  }, []);

  const generateTemplate = useCallback(() => {
    const csv = ALL_COLS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lens_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    rows, summary, unresolvedRefs, hasUnresolved,
    isValidating, isImporting, batchId, fileName,
    parseAndValidate, resolveRef, executeImport, reset, generateTemplate,
  };
};
