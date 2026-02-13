import { useRef, useCallback, useState } from "react";
import { useImportSupplies } from "@/hooks/useImportSupplies";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, Play, RotateCcw, FileText, AlertCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; bg: string; fg: string }> = {
  valid:     { label: "New",      bg: "hsl(142 71% 45% / 0.1)", fg: "hsl(142 71% 35%)" },
  duplicate: { label: "Upsert",   bg: "hsl(38 92% 50% / 0.12)", fg: "hsl(38 80% 35%)" },
  error:     { label: "Error",    bg: "hsl(0 84% 60% / 0.1)",   fg: "hsl(0 72% 45%)" },
  imported:  { label: "Imported", bg: "hsl(215 65% 50% / 0.1)", fg: "hsl(215 65% 50%)" },
};

const ImportSuppliesTab = () => {
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const { rows, summary, isValidating, isImporting, fileName, parseAndValidate, executeImport, reset, generateTemplate } = useImportSupplies();

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }
    parseAndValidate(file);
  }, [parseAndValidate, toast]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); };

  const handleImport = async () => {
    await executeImport();
    toast({ title: "Import complete", description: `${summary.valid + summary.duplicates} rows processed.` });
  };

  if (!canEdit) return <div className="p-4 text-sm" style={{ color: "hsl(215 15% 50%)" }}>You don't have permission to import data.</div>;

  const hasRows = rows.length > 0;
  const importable = summary.valid + summary.duplicates;
  const allImported = hasRows && summary.imported === rows.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={generateTemplate}>
          <Download className="h-3.5 w-3.5" /> Template
        </Button>
        {hasRows && (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={reset}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {!hasRows && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center gap-3 cursor-pointer transition-colors"
          style={{
            borderColor: dragActive ? "hsl(215 65% 50%)" : "hsl(215 15% 80%)",
            background: dragActive ? "hsl(215 65% 50% / 0.04)" : "hsl(215 10% 98%)",
          }}
        >
          <Upload className="h-8 w-8" style={{ color: "hsl(215 15% 60%)" }} />
          <p className="text-sm" style={{ color: "hsl(215 15% 40%)" }}>
            {isValidating ? "Validating…" : "Drop a CSV file here or click to browse"}
          </p>
          <p className="text-xs" style={{ color: "hsl(215 15% 60%)" }}>
            Columns: Name, SKU, Category, Description, Supplier, Brand, BaseCost, SellPrice, Currency, …
          </p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
        </div>
      )}

      {hasRows && (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "hsl(215 10% 96%)" }}>
          <FileText className="h-4 w-4 shrink-0" style={{ color: "hsl(215 15% 50%)" }} />
          <span className="text-xs font-medium" style={{ color: "hsl(215 30% 15%)" }}>{fileName}</span>
          <span className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>— {summary.total} rows</span>
          {summary.valid > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.valid.bg, color: statusConfig.valid.fg }}>{summary.valid} new</Badge>}
          {summary.duplicates > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.duplicate.bg, color: statusConfig.duplicate.fg }}>{summary.duplicates} upsert</Badge>}
          {summary.errors > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.error.bg, color: statusConfig.error.fg }}>{summary.errors} errors</Badge>}
          {summary.imported > 0 && <Badge variant="outline" className="text-[10px] h-5 border-0" style={{ background: statusConfig.imported.bg, color: statusConfig.imported.fg }}>{summary.imported} imported</Badge>}
          <div className="ml-auto">
            {!allImported && importable > 0 && (
              <Button size="sm" className="h-7 text-xs gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} disabled={isImporting} onClick={handleImport}>
                <Play className="h-3.5 w-3.5" /> {isImporting ? "Importing…" : `Import ${importable} rows`}
              </Button>
            )}
          </div>
        </div>
      )}

      {hasRows && (
        <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)", maxHeight: "calc(100vh - 380px)" }}>
          <Table>
            <TableHeader className="sticky top-0 z-10" style={{ background: "hsl(0 0% 100%)", boxShadow: "inset 0 -1px 0 hsl(215 15% 85%)" }}>
              <TableRow>
                <TableHead className="w-12 text-xs">#</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">SKU</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Supplier</TableHead>
                <TableHead className="text-xs">Brand</TableHead>
                <TableHead className="text-xs">Base Cost</TableHead>
                <TableHead className="text-xs">Sell Price</TableHead>
                <TableHead className="text-xs">Currency</TableHead>
                <TableHead className="text-xs">Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const cfg = statusConfig[row.status] ?? statusConfig.error;
                return (
                  <TableRow key={row.rowNumber}>
                    <TableCell className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{row.rowNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-0 font-medium" style={{ background: cfg.bg, color: cfg.fg }}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium">{row.raw.name ?? row.raw.Name ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.sku ?? row.raw.SKU ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.category ?? row.raw.Category ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.supplier ?? row.raw.Supplier ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.brand ?? row.raw.Brand ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.basecost ?? row.raw.BaseCost ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.sellprice ?? row.raw.SellPrice ?? ""}</TableCell>
                    <TableCell className="text-xs">{row.raw.currency ?? row.raw.Currency ?? ""}</TableCell>
                    <TableCell>
                      {row.errors.length > 0 && (
                        <div className="flex items-start gap-1">
                          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" style={{ color: "hsl(0 72% 45%)" }} />
                          <span className="text-[10px] leading-tight" style={{ color: "hsl(0 72% 45%)" }}>{row.errors.join("; ")}</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default ImportSuppliesTab;
