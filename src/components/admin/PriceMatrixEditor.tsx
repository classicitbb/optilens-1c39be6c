import { useState, useCallback, useEffect } from "react";
import { usePriceMatrix, PriceMatrixRow, INDEX_COLUMNS } from "@/hooks/usePriceMatrix";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

interface PriceMatrixEditorProps {
  showUSD: boolean;
  fxRate: number; // bbd_to_usd e.g. 0.5 → 1 BBD = 0.5 USD
}

const fmt = (val: number | null, showUSD: boolean, fxRate: number): string => {
  if (val === null || val === undefined) return "";
  const display = showUSD ? val * fxRate : val;
  return display === 0 ? "" : display.toFixed(2);
};

const PriceMatrixEditor = ({ showUSD, fxRate }: PriceMatrixEditorProps) => {
  const { data: rows, isLoading, saveMutation } = usePriceMatrix();
  const { toast } = useToast();

  const [localRows, setLocalRows] = useState<PriceMatrixRow[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (rows && !dirty) {
      setLocalRows(rows);
    }
  }, [rows, dirty]);

  const handleCellChange = useCallback(
    (id: number, col: keyof PriceMatrixRow, raw: string) => {
      if (raw.trim() === "") {
        setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, [col]: null } : r)));
        setDirty(true);
        return;
      }
      const displayVal = parseFloat(raw);
      if (isNaN(displayVal)) return;
      // Convert back to BBD for storage
      const storedVal = showUSD ? displayVal / fxRate : displayVal;
      setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, [col]: storedVal } : r)));
      setDirty(true);
    },
    [showUSD, fxRate]
  );

  const handleSave = () => {
    saveMutation.mutate(localRows, {
      onSuccess: () => {
        setDirty(false);
        toast({ title: "Price matrix saved" });
      },
      onError: (e: any) =>
        toast({ title: "Save failed", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No matrix data found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            Simple Base Pricing Matrix –{" "}
            <span style={{ color: "hsl(215 65% 50%)" }}>{showUSD ? "USD" : "BBD"}</span>{" "}
            (all add-ons extra)
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "hsl(215 15% 40%)" }}>
            Click any cell to edit.{" "}
            {showUSD
              ? "Displaying in USD — values auto-convert on save."
              : "Displaying in BBD (base currency)."}
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
          style={{ background: "hsl(215 65% 50%)", color: "white" }}
          onClick={handleSave}
          disabled={!dirty || saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save All Changes
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-auto border border-border rounded-md">
        <table className="w-full text-xs border-collapse bg-background">
          <thead>
            <tr style={{ background: "hsl(215 15% 96%)" }} className="border-b border-border">
              <th
                className="px-3 py-2 text-left font-bold border-r border-border"
                style={{ minWidth: 220, color: "hsl(215 30% 15%)" }}
              >
                Category
              </th>
              {INDEX_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-center font-bold border-r border-border last:border-r-0"
                  style={{ minWidth: 90, color: "hsl(215 30% 15%)" }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localRows.map((row, rowIdx) => (
              <tr
                key={row.id}
                className={
                  rowIdx % 2 === 0
                    ? "bg-background hover:bg-muted/30 transition-colors"
                    : "bg-muted/20 hover:bg-muted/40 transition-colors"
                }
              >
                <td
                  className="px-3 py-1.5 font-semibold border-r border-border whitespace-nowrap"
                  style={{ color: "hsl(215 30% 15%)" }}
                >
                  {row.category}
                </td>
                {INDEX_COLUMNS.map((col) => {
                  const val = row[col.key];
                  return (
                    <td key={col.key} className="border-r border-border last:border-r-0 p-0">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={fmt(val, showUSD, fxRate)}
                        placeholder="–"
                        onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        }}
                        className="w-full h-full px-2 py-1.5 text-right bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded-sm placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dirty && (
        <p className="text-xs" style={{ color: "hsl(38 92% 40%)" }}>
          You have unsaved changes — click "Save All Changes" to persist.
        </p>
      )}
    </div>
  );
};

export default PriceMatrixEditor;
