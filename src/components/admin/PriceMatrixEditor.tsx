import { useState, useCallback, useEffect } from "react";
import { usePriceMatrix, PriceMatrixRow, INDEX_COLUMNS } from "@/hooks/usePriceMatrix";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save, Loader2 } from "lucide-react";

const PriceMatrixEditor = () => {
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
      const val = raw.trim() === "" ? null : parseFloat(raw);
      setLocalRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [col]: isNaN(val as number) ? null : val } : r))
      );
      setDirty(true);
    },
    []
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
          <h2 className="text-sm font-semibold text-foreground">
            Simple Base Pricing Matrix – BBD (all add-ons extra)
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click any cell to edit. Press Tab or Enter to advance.
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs gap-1.5"
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
            <tr className="bg-muted/60 border-b border-border">
              <th
                className="px-3 py-2 text-left font-bold text-foreground border-r border-border"
                style={{ minWidth: 220 }}
              >
                Category
              </th>
              {INDEX_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-center font-bold text-foreground border-r border-border last:border-r-0"
                  style={{ minWidth: 90 }}
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
                {/* Category label */}
                <td className="px-3 py-1.5 font-semibold text-foreground border-r border-border whitespace-nowrap">
                  {row.category}
                </td>

                {/* Editable price cells */}
                {INDEX_COLUMNS.map((col) => {
                  const val = row[col.key];
                  return (
                    <td
                      key={col.key}
                      className="border-r border-border last:border-r-0 p-0"
                    >
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={val ?? ""}
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
