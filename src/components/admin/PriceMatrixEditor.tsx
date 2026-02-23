import { useState, useCallback, useEffect } from "react";
import { usePriceMatrix, PriceMatrixRow, INDEX_COLUMNS } from "@/hooks/usePriceMatrix";
import { useLenses } from "@/hooks/useLenses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Save, Loader2, Search } from "lucide-react";
import { LensPickerPopover, PickedItem } from "@/components/admin/LensPickerPopover";
import MarginBadge from "@/components/admin/MarginBadge";

interface PriceMatrixEditorProps {
  showUSD: boolean;
  fxRate: number;
}

// Assignment: matrixRowId + colKey → { lensId, lensName, sellPriceBBD }
interface CellAssignment {
  lensId: string;
  lensName: string;
  sellPriceBBD: number;
  costBBD: number | null;
}

type AssignmentMap = Record<string, CellAssignment>; // key = `${rowId}_${colKey}`

const cellKey = (rowId: number, colKey: string) => `${rowId}_${colKey}`;

const fmt = (val: number | null, showUSD: boolean, fxRate: number): string => {
  if (val === null || val === undefined) return "";
  const display = showUSD ? val * fxRate : val;
  return display === 0 ? "" : display.toFixed(2);
};

const PriceMatrixEditor = ({ showUSD, fxRate }: PriceMatrixEditorProps) => {
  const { data: rows, isLoading, saveMutation } = usePriceMatrix();
  const { data: allLenses } = useLenses();
  const { toast } = useToast();

  const [localRows, setLocalRows] = useState<PriceMatrixRow[]>([]);
  const [dirty, setDirty] = useState(false);
  const [assignments, setAssignments] = useState<AssignmentMap>({});

  // Picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ rowId: number; colKey: string } | null>(null);

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
      const storedVal = showUSD ? displayVal / fxRate : displayVal;
      setLocalRows((prev) => prev.map((r) => (r.id === id ? { ...r, [col]: storedVal } : r)));
      setDirty(true);
    },
    [showUSD, fxRate]
  );

  const openPicker = (rowId: number, colKey: string) => {
    setPickerTarget({ rowId, colKey });
    setPickerOpen(true);
  };

  const handlePick = (item: PickedItem) => {
    if (!pickerTarget || item.type !== "lens") return;
    const { rowId, colKey } = pickerTarget;
    const sellBBD = item.sell_price;
    // Find cost from allLenses
    const lens = (allLenses ?? []).find((l) => l.id === item.id);
    const costBBD = lens ? lens.base_price : null;

    // Write price into the matrix cell (BBD stored value)
    setLocalRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [colKey]: sellBBD } : r))
    );
    setAssignments((prev) => ({
      ...prev,
      [cellKey(rowId, colKey)]: {
        lensId: item.id,
        lensName: item.name,
        sellPriceBBD: sellBBD,
        costBBD,
      },
    }));
    setDirty(true);
    toast({
      title: "Lens assigned",
      description: `${item.name} → $${sellBBD.toFixed(2)} BBD`,
    });
  };

  const clearAssignment = (rowId: number, colKey: string) => {
    const k = cellKey(rowId, colKey);
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

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

  const currentCellId = pickerTarget
    ? assignments[cellKey(pickerTarget.rowId, pickerTarget.colKey)]?.lensId ?? null
    : null;

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
            Click any cell to edit manually, or click{" "}
            <Search className="inline h-3 w-3" /> to link a pricelist lens.{" "}
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
                  style={{ minWidth: 110, color: "hsl(215 30% 15%)" }}
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
                  const k = cellKey(row.id, col.key);
                  const assignment = assignments[k];
                  // Compute margin: use assignment cost if available, else try to find from lens data
                  const cellCost = assignment?.costBBD ?? null;
                  const cellSell = val ?? null;
                  const marginPct =
                    cellCost != null && cellCost > 0 && cellSell != null && cellSell > 0
                      ? parseFloat((((cellSell - cellCost) / cellSell) * 100).toFixed(1))
                      : null;

                  return (
                    <td key={col.key} className="border-r border-border last:border-r-0 p-0">
                      <div className="flex flex-col">
                        {/* Input row + picker button */}
                        <div className="flex items-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={fmt(val, showUSD, fxRate)}
                            placeholder="–"
                            onChange={(e) => {
                              handleCellChange(row.id, col.key, e.target.value);
                              // Manual edit clears any assignment
                              clearAssignment(row.id, col.key);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            className="flex-1 min-w-0 px-2 py-1.5 text-right bg-transparent outline-none focus:bg-primary/5 focus:ring-1 focus:ring-primary/30 rounded-sm placeholder:text-muted-foreground/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={() => openPicker(row.id, col.key)}
                            className="shrink-0 px-1 py-1 hover:bg-primary/10 rounded transition-colors"
                            title="Link a pricelist lens to this cell"
                          >
                            <Search
                              className="h-3 w-3"
                              style={{
                                color: assignment
                                  ? "hsl(215 65% 50%)"
                                  : "hsl(215 15% 65%)",
                              }}
                            />
                          </button>
                        </div>

                        {/* Linked lens label + margin badge */}
                        <div className="flex items-center gap-1 px-2 pb-0.5">
                          {assignment && (
                            <span
                              className="text-[9px] truncate flex-1 min-w-0"
                              style={{ color: "hsl(215 65% 45%)" }}
                              title={assignment.lensName}
                            >
                              ↳ {assignment.lensName}
                            </span>
                          )}
                          {marginPct != null && (
                            <MarginBadge
                              marginPercent={marginPct}
                              cost={cellCost}
                              sellPrice={cellSell}
                              itemName={assignment?.lensName}
                              inline
                            />
                          )}
                        </div>
                      </div>
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

      {/* Lens Picker */}
      <LensPickerPopover
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={handlePick}
        currentId={currentCellId}
        mode="lens-only"
      />
    </div>
  );
};

export default PriceMatrixEditor;
