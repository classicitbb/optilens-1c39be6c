import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── CSV columns matching the user's actual file ──
const REQUIRED_COLS = [
  "showinpl", "fulllab", "supplier", "material", "mftype",
  "lenstype", "option", "finishtype", "brand", "uscost", "showinwspl",
] as const;

const ALL_COLS = ["ShowInPL", "FullLab", "Supplier", "Material", "MFType", "LensType", "Option", "FinishType", "Brand", "USCost", "ShowInWSPL"];

export type RowStatus = "valid" | "error" | "duplicate" | "imported";

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  errors: string[];
  generatedName: string;
  resolved: {
    supplier_id?: string;
    brand_id?: string;
    material_id?: string;
    mftype_id?: string;
    lenstype_id?: string;
    lens_option_id?: string;
    finishtype_id?: string;
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

type RefEntry = { id: string; name: string; abbrev?: string };
type RefMap = Map<string, RefEntry>; // lowercase name → { id, name, abbrev }

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

function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  // Handle tab-separated or comma-separated
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h.toLowerCase()] = values[i] ?? ""; });
    // Keep original-case keys too for display
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

function isNumeric(v: string): boolean {
  return v !== "" && !isNaN(Number(v));
}

function parseBool(v: string): boolean {
  const lower = v.toLowerCase().trim();
  return lower === "true" || lower === "1" || lower === "yes" || lower === "y" || lower === "x";
}

/** Generate lens name from Material abbrev + MFType abbrev + LensType name + Option name */
function generateLensName(
  material?: RefEntry,
  mftype?: RefEntry,
  lenstype?: RefEntry,
  option?: RefEntry,
): string {
  return [material?.abbrev, mftype?.abbrev, lenstype?.name, option?.name]
    .filter(Boolean)
    .join(" ");
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

      // Check headers (case-insensitive)
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
      const [suppliers, brands, materials, mftypes, lenstypes, lensOptions, finishtypes] = await Promise.all([
        fetchRefMap("suppliers"),
        fetchRefMap("brands"),
        fetchRefMap("materials"),
        fetchRefMap("mftypes"),
        fetchRefMap("lenstypes"),
        fetchRefMap("lens_options"),
        fetchRefMap("finishtypes"),
      ]);

      // Fetch existing lenses for duplicate/upsert detection
      const { data: existingLenses } = await supabase
        .from("lenses")
        .select("id, name");
      const lensMap = new Map<string, string>();
      ((existingLenses as any[]) ?? []).forEach((l: any) => lensMap.set(l.name.toLowerCase().trim(), l.id));

      // Validate each row
      const parsed: ParsedRow[] = rawRows.map((raw, i) => {
        const errors: string[] = [];
        const resolved: ParsedRow["resolved"] = {};

        // Resolve references
        const refChecks: { col: string; map: RefMap; key: keyof ParsedRow["resolved"] }[] = [
          { col: "supplier", map: suppliers, key: "supplier_id" },
          { col: "brand", map: brands, key: "brand_id" },
          { col: "material", map: materials, key: "material_id" },
          { col: "mftype", map: mftypes, key: "mftype_id" },
          { col: "lenstype", map: lenstypes, key: "lenstype_id" },
          { col: "option", map: lensOptions, key: "lens_option_id" },
          { col: "finishtype", map: finishtypes, key: "finishtype_id" },
        ];

        let resolvedMaterial: RefEntry | undefined;
        let resolvedMftype: RefEntry | undefined;
        let resolvedLenstype: RefEntry | undefined;
        let resolvedOption: RefEntry | undefined;

        for (const { col, map, key } of refChecks) {
          const val = raw[col]?.trim();
          if (!val) {
            errors.push(`${col} is required`);
          } else {
            const entry = map.get(val.toLowerCase());
            if (!entry) errors.push(`${col} "${val}" not found in active records`);
            else {
              resolved[key] = entry.id;
              if (col === "material") resolvedMaterial = entry;
              if (col === "mftype") resolvedMftype = entry;
              if (col === "lenstype") resolvedLenstype = entry;
              if (col === "option") resolvedOption = entry;
            }
          }
        }

        // Validate USCost
        const uscost = raw["uscost"] ?? "";
        if (!isNumeric(uscost)) errors.push("USCost must be a number");

        // Auto-generate name
        const generatedName = generateLensName(resolvedMaterial, resolvedMftype, resolvedLenstype, resolvedOption);

        // Determine duplicate status (by generated name)
        const existingId = generatedName ? lensMap.get(generatedName.toLowerCase().trim()) : undefined;

        const status: RowStatus = errors.length > 0 ? "error" : existingId ? "duplicate" : "valid";

        return {
          rowNumber: i + 1,
          raw,
          status,
          errors,
          generatedName,
          resolved,
          existingLensId: existingId,
        };
      });

      setRows(parsed);
    } catch (err: any) {
      setRows([{
        rowNumber: 0, raw: {}, status: "error", generatedName: "",
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
          const lensData = {
            name: row.generatedName,
            supplier_id: row.resolved.supplier_id!,
            brand_id: row.resolved.brand_id!,
            material_id: row.resolved.material_id!,
            mftype_id: row.resolved.mftype_id!,
            lenstype_id: row.resolved.lenstype_id!,
            index_value: 1.5, // default
            base_price: Number(raw["uscost"] || 0),
            sell_price: 0, // to be calculated by pricing engine
            sph_min: -6,
            sph_max: 6,
            cyl_min: -4,
            cyl_max: 0,
            add_min: null,
            add_max: null,
            show_in_pricelist: parseBool(raw["showinpl"] ?? ""),
            full_lab: parseBool(raw["fulllab"] ?? ""),
            show_in_ws_pricelist: parseBool(raw["showinwspl"] ?? ""),
            show_on_website: false,
            notes: null,
            is_active: true,
          };

          let lensId: string;

          if (row.existingLensId) {
            const { error } = await supabase
              .from("lenses")
              .update(lensData as any)
              .eq("id", row.existingLensId);
            if (error) throw error;
            lensId = row.existingLensId;
          } else {
            const { data: newLens, error } = await supabase
              .from("lenses")
              .insert(lensData as any)
              .select("id")
              .single();
            if (error) throw error;
            lensId = newLens.id;
          }

          // Handle lens_option
          await supabase.from("lens_lens_options").delete().eq("lens_id", lensId);
          if (row.resolved.lens_option_id) {
            await supabase.from("lens_lens_options").insert({
              lens_id: lensId,
              lens_option_id: row.resolved.lens_option_id,
              extra_cost: 0,
            } as any);
          }

          // Store staging row
          await supabase.from("pricing_input_rows").insert({
            batch_id: batch.id,
            row_number: row.rowNumber,
            raw_data: raw,
            status: "imported",
            resolved_data: { lens_id: lensId },
            lens_id: lensId,
          } as any);

          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "imported" };
          successCount++;
        } catch (err: any) {
          try {
            await supabase.from("pricing_input_rows").insert({
              batch_id: batch.id,
              row_number: row.rowNumber,
              raw_data: row.raw,
              status: "error",
              error_messages: [err.message || "Unknown error"],
            } as any);
          } catch { /* ignore */ }

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
    rows, summary, isValidating, isImporting, batchId, fileName,
    parseAndValidate, executeImport, reset, generateTemplate,
  };
};
