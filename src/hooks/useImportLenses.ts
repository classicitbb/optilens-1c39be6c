import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── CSV column spec ──
const REQUIRED_COLS = [
  "name", "supplier", "brand", "material", "mftype", "lenstype",
  "index", "base_price", "sell_price",
  "sph_min", "sph_max", "cyl_min", "cyl_max", "lens_option",
] as const;

const OPTIONAL_COLS = [
  "add_min", "add_max", "option_extra_cost", "notes",
  "show_in_pricelist", "full_lab", "show_in_ws_pricelist", "show_on_website",
] as const;

const ALL_COLS = [...REQUIRED_COLS, ...OPTIONAL_COLS];

export type RowStatus = "valid" | "error" | "duplicate" | "imported";

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  errors: string[];
  resolved: {
    supplier_id?: string;
    brand_id?: string;
    material_id?: string;
    mftype_id?: string;
    lenstype_id?: string;
    lens_option_id?: string;
  };
  existingLensId?: string;
}

export interface ImportSummary {
  total: number;
  valid: number;
  errors: number;
  duplicates: number;
  imported: number;
}

type RefMap = Map<string, string>; // lowercase name → id

async function fetchRefMap(table: string): Promise<RefMap> {
  const { data, error } = await (supabase
    .from(table as any)
    .select("id, name, is_active") as any)
    .eq("is_active", true);
  if (error) throw error;
  const map = new Map<string, string>();
  ((data as any[]) ?? []).forEach((r: any) => map.set(r.name.toLowerCase().trim(), r.id));
  return map;
}

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function isNumeric(v: string): boolean {
  return v !== "" && !isNaN(Number(v));
}

function parseBool(v: string): boolean {
  const lower = v.toLowerCase().trim();
  return lower === "true" || lower === "1" || lower === "yes" || lower === "y";
}

export const useImportLenses = () => {
  const [rows, setRows] = useState<ParsedRow[]>([]);
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

  const parseAndValidate = useCallback(async (file: File) => {
    setIsValidating(true);
    setFileName(file.name);
    setBatchId(null);

    try {
      const text = await file.text();
      const rawRows = parseCSVText(text);

      if (rawRows.length === 0) {
        setRows([]);
        setIsValidating(false);
        return;
      }

      // Check headers
      const headers = Object.keys(rawRows[0]);
      const missingHeaders = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missingHeaders.length > 0) {
        setRows([{
          rowNumber: 0, raw: {}, status: "error",
          errors: [`Missing required columns: ${missingHeaders.join(", ")}`],
          resolved: {},
        }]);
        setIsValidating(false);
        return;
      }

      // Fetch all reference data
      const [suppliers, brands, materials, mftypes, lenstypes, lensOptions] = await Promise.all([
        fetchRefMap("suppliers"),
        fetchRefMap("brands"),
        fetchRefMap("materials"),
        fetchRefMap("mftypes"),
        fetchRefMap("lenstypes"),
        fetchRefMap("lens_options"),
      ]);

      // Fetch existing lenses for duplicate/upsert detection
      const { data: existingLenses } = await supabase
        .from("lenses")
        .select("id, name");
      const lensMap = new Map<string, string>();
      (existingLenses ?? []).forEach((l: any) => lensMap.set(l.name.toLowerCase().trim(), l.id));

      // Validate each row
      const parsed: ParsedRow[] = rawRows.map((raw, i) => {
        const errors: string[] = [];
        const resolved: ParsedRow["resolved"] = {};

        // Required text fields
        if (!raw.name?.trim()) errors.push("name is required");

        // Resolve references
        const refChecks: { col: string; map: RefMap; key: keyof ParsedRow["resolved"] }[] = [
          { col: "supplier", map: suppliers, key: "supplier_id" },
          { col: "brand", map: brands, key: "brand_id" },
          { col: "material", map: materials, key: "material_id" },
          { col: "mftype", map: mftypes, key: "mftype_id" },
          { col: "lenstype", map: lenstypes, key: "lenstype_id" },
          { col: "lens_option", map: lensOptions, key: "lens_option_id" },
        ];

        for (const { col, map, key } of refChecks) {
          const val = raw[col]?.trim();
          if (!val) {
            errors.push(`${col} is required`);
          } else {
            const id = map.get(val.toLowerCase());
            if (!id) errors.push(`${col} "${val}" not found in active records`);
            else resolved[key] = id;
          }
        }

        // Numeric fields
        const numFields = ["index", "base_price", "sell_price", "sph_min", "sph_max", "cyl_min", "cyl_max"];
        for (const f of numFields) {
          if (!isNumeric(raw[f] ?? "")) errors.push(`${f} must be a number`);
        }
        // Optional numerics
        for (const f of ["add_min", "add_max", "option_extra_cost"]) {
          const v = raw[f]?.trim();
          if (v && !isNumeric(v)) errors.push(`${f} must be a number if provided`);
        }

        // Determine duplicate status
        const existingId = lensMap.get(raw.name?.toLowerCase().trim());

        const status: RowStatus = errors.length > 0 ? "error" : existingId ? "duplicate" : "valid";

        return {
          rowNumber: i + 1,
          raw,
          status,
          errors,
          resolved,
          existingLensId: existingId,
        };
      });

      setRows(parsed);
    } catch (err: any) {
      setRows([{
        rowNumber: 0, raw: {}, status: "error",
        errors: [err.message || "Failed to parse file"],
        resolved: {},
      }]);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const executeImport = useCallback(async () => {
    const importable = rows.filter((r) => r.status === "valid" || r.status === "duplicate");
    if (importable.length === 0) return;

    setIsImporting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create batch record
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
          const lensData = {
            name: raw.name.trim(),
            supplier_id: row.resolved.supplier_id!,
            brand_id: row.resolved.brand_id!,
            material_id: row.resolved.material_id!,
            mftype_id: row.resolved.mftype_id!,
            lenstype_id: row.resolved.lenstype_id!,
            index_value: Number(raw.index),
            base_price: Number(raw.base_price),
            sell_price: Number(raw.sell_price),
            sph_min: Number(raw.sph_min),
            sph_max: Number(raw.sph_max),
            cyl_min: Number(raw.cyl_min),
            cyl_max: Number(raw.cyl_max),
            add_min: raw.add_min?.trim() ? Number(raw.add_min) : null,
            add_max: raw.add_max?.trim() ? Number(raw.add_max) : null,
            show_in_pricelist: raw.show_in_pricelist ? parseBool(raw.show_in_pricelist) : true,
            full_lab: raw.full_lab ? parseBool(raw.full_lab) : false,
            show_in_ws_pricelist: raw.show_in_ws_pricelist ? parseBool(raw.show_in_ws_pricelist) : false,
            show_on_website: raw.show_on_website ? parseBool(raw.show_on_website) : false,
            notes: raw.notes?.trim() || null,
            is_active: true,
          };

          let lensId: string;

          if (row.existingLensId) {
            // Upsert: update existing
            const { error } = await supabase
              .from("lenses")
              .update(lensData as any)
              .eq("id", row.existingLensId);
            if (error) throw error;
            lensId = row.existingLensId;
          } else {
            // Insert new
            const { data: newLens, error } = await supabase
              .from("lenses")
              .insert(lensData as any)
              .select("id")
              .single();
            if (error) throw error;
            lensId = newLens.id;
          }

          // Handle lens_option: delete existing, insert new
          await supabase.from("lens_lens_options").delete().eq("lens_id", lensId);
          const extraCost = raw.option_extra_cost?.trim() ? Number(raw.option_extra_cost) : 0;
          const { error: optErr } = await supabase
            .from("lens_lens_options")
            .insert({
              lens_id: lensId,
              lens_option_id: row.resolved.lens_option_id!,
              extra_cost: extraCost,
            } as any);
          if (optErr) throw optErr;

          // Store staging row
          await supabase.from("pricing_input_rows").insert({
            batch_id: batch.id,
            row_number: row.rowNumber,
            raw_data: raw,
            status: "imported",
            resolved_data: { lens_id: lensId },
            lens_id: lensId,
          } as any);

          // Update local state
          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "imported" };
          successCount++;
        } catch (err: any) {
          // Store error row
          try {
            await supabase.from("pricing_input_rows").insert({
              batch_id: batch.id,
              row_number: row.rowNumber,
              raw_data: row.raw,
              status: "error",
              error_messages: [err.message || "Unknown error"],
            } as any);
          } catch { /* ignore staging error */ }

          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) {
            updatedRows[idx] = {
              ...updatedRows[idx],
              status: "error",
              errors: [...updatedRows[idx].errors, err.message || "Import failed"],
            };
          }
          errorCount++;
        }
      }

      setRows(updatedRows);

      // Update batch status
      await supabase.from("import_batches").update({
        status: "completed",
        success_count: successCount,
        error_count: errorCount,
      } as any).eq("id", batch.id);

    } catch (err: any) {
      console.error("Import failed:", err);
    } finally {
      setIsImporting(false);
    }
  }, [rows, fileName]);

  const reset = useCallback(() => {
    setRows([]);
    setBatchId(null);
    setFileName(null);
  }, []);

  const generateTemplate = useCallback(() => {
    const csv = ALL_COLS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lens_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    rows,
    summary,
    isValidating,
    isImporting,
    batchId,
    fileName,
    parseAndValidate,
    executeImport,
    reset,
    generateTemplate,
  };
};
