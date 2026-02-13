import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const REQUIRED_COLS = ["name"] as const;
const ALL_COLS = ["Name", "SKU", "Category", "Description", "Price", "Supplier", "IsActive", "ShowOnWebsite", "SortOrder"];

export type RowStatus = "valid" | "error" | "duplicate" | "imported";

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  status: RowStatus;
  errors: string[];
  existingId?: string;
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

export const useImportAddons = () => {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
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

    try {
      const text = await file.text();
      const rawRows = parseCSVText(text);
      if (rawRows.length === 0) { setRows([]); setIsValidating(false); return; }

      const headers = Object.keys(rawRows[0]).map((h) => h.toLowerCase());
      const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        setRows([{ rowNumber: 0, raw: {}, status: "error", errors: [`Missing required columns: ${missing.join(", ")}`] }]);
        setIsValidating(false);
        return;
      }

      const { data: existing } = await supabase.from("addons").select("id, name");
      const nameMap = new Map<string, string>();
      ((existing as any[]) ?? []).forEach((a: any) => nameMap.set(a.name.toLowerCase().trim(), a.id));

      const parsed: ParsedRow[] = rawRows.map((raw, i) => {
        const errors: string[] = [];
        const name = raw["name"]?.trim();
        if (!name) errors.push("Name is required");

        const existingId = name ? nameMap.get(name.toLowerCase()) : undefined;
        const status: RowStatus = errors.length > 0 ? "error" : existingId ? "duplicate" : "valid";

        return { rowNumber: i + 1, raw, status, errors, existingId };
      });

      setRows(parsed);
    } catch (err: any) {
      setRows([{ rowNumber: 0, raw: {}, status: "error", errors: [err.message || "Failed to parse file"] }]);
    } finally {
      setIsValidating(false);
    }
  }, []);

  const executeImport = useCallback(async () => {
    const importable = rows.filter((r) => r.status === "valid" || r.status === "duplicate");
    if (importable.length === 0) return;
    setIsImporting(true);

    try {
      const { data: suppliers } = await supabase.from("suppliers").select("id, name").eq("is_active", true);
      const supplierMap = new Map<string, string>();
      ((suppliers as any[]) ?? []).forEach((s: any) => supplierMap.set(s.name.toLowerCase().trim(), s.id));

      const updatedRows = [...rows];

      for (const row of importable) {
        try {
          const raw = row.raw;
          const supplierName = (raw["supplier"] ?? "").trim().toLowerCase();

          const data: any = {
            name: raw["name"]?.trim(),
            sku: raw["sku"]?.trim() || "",
            category: raw["category"]?.trim() || "Coating",
            description: raw["description"]?.trim() || "",
            price: cleanNumber(raw["price"] ?? "") ?? 0,
            is_active: parseBool(raw["isactive"] ?? "true"),
            show_on_website: parseBool(raw["showonwebsite"] ?? ""),
            sort_order: cleanNumber(raw["sortorder"] ?? "") ?? 0,
            supplier_id: supplierName ? supplierMap.get(supplierName) ?? null : null,
          };

          if (row.existingId) {
            await supabase.from("addons").update(data).eq("id", row.existingId);
          } else {
            await supabase.from("addons").insert(data);
          }

          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "imported" };
        } catch (err: any) {
          const idx = updatedRows.findIndex((r) => r.rowNumber === row.rowNumber);
          if (idx >= 0) updatedRows[idx] = { ...updatedRows[idx], status: "error", errors: [...updatedRows[idx].errors, err.message] };
        }
      }

      setRows(updatedRows);
      queryClient.invalidateQueries({ queryKey: ["addons"] });
    } finally {
      setIsImporting(false);
    }
  }, [rows, queryClient]);

  const reset = useCallback(() => { setRows([]); setFileName(null); }, []);

  const generateTemplate = useCallback(() => {
    const csv = ALL_COLS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "addons_import_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { rows, summary, isValidating, isImporting, fileName, parseAndValidate, executeImport, reset, generateTemplate };
};
