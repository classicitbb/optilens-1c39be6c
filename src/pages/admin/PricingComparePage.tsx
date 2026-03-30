import { useMemo, useState } from "react";
import { Search, Plus, ThumbsUp, ThumbsDown, X, Link2, Unlink2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLenses, type Lens } from "@/hooks/useLenses";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLensPreferences } from "@/hooks/useLensPreferences";
import { fieldsMatch } from "@/lib/wildcardMatch";

type CompareMetric = "cost_usd" | "sell_usd" | "sell_bbd" | "markup_percent";
type DiffMode = "absolute" | "percent";

type CompareSlot = { column: 1 | 2 | 3; lens: Lens | null };

const COLUMNS = [1, 2, 3] as const;

const currency = (value: number) => `$${value.toFixed(2)}`;

const PricingComparePage = () => {
  const isMobile = useIsMobile();
  const { data: lenses = [], isLoading } = useLenses();
  const { settings } = usePricingEngine();
  const { preferences, setPreference } = useLensPreferences();

  const [searchByColumn, setSearchByColumn] = useState<Record<1 | 2 | 3, string>>({ 1: "", 2: "", 3: "" });
  const [linkedSearch, setLinkedSearch] = useState(false);
  const [selected, setSelected] = useState<CompareSlot[]>([
    { column: 1, lens: null },
    { column: 2, lens: null },
    { column: 3, lens: null },
  ]);
  const [metric, setMetric] = useState<CompareMetric>("cost_usd");
  const [diffMode, setDiffMode] = useState<DiffMode>("absolute");

  const fxRate = useMemo(() => {
    if (!settings) return 2;
    const rates = settings.fx_rates as Record<string, number>;
    return (rates.USD ?? 1) * (1 + settings.fx_risk_buffer);
  }, [settings]);

  const visibleLenses = useMemo(
    () => lenses.filter((lens) => lens.is_active && (lens.show_in_pricelist || lens.sell_price > 0)),
    [lenses]
  );

  const selectedByColumn = useMemo(() => {
    const lookup = new Map<1 | 2 | 3, Lens | null>();
    selected.forEach((entry) => lookup.set(entry.column, entry.lens));
    return lookup;
  }, [selected]);

  const filteredByColumn = useMemo(() => {
    const selectedLensIdsByColumn = {
      1: selectedByColumn.get(1)?.id ?? null,
      2: selectedByColumn.get(2)?.id ?? null,
      3: selectedByColumn.get(3)?.id ?? null,
    };

    const filterFor = (column: 1 | 2 | 3) => {
      const query = searchByColumn[column].trim().toLowerCase();
      const blockedLensIds = new Set(
        COLUMNS
          .filter((entry) => entry !== column)
          .map((entry) => selectedLensIdsByColumn[entry])
          .filter((entry): entry is string => Boolean(entry))
      );

      const columnBase = visibleLenses.filter((lens) => !blockedLensIds.has(lens.id));
      if (!query) return columnBase.slice(0, 40);
      return columnBase
        .filter((lens) =>
          fieldsMatch(
            query,
            lens.name,
            lens.supplier?.name,
            lens.supplier?.abbrev,
            lens.brand?.name,
            lens.material?.name,
            lens.lenstype?.name,
            lens.notes
          )
        )
        .slice(0, 40);
    };

    return {
      1: filterFor(1),
      2: filterFor(2),
      3: filterFor(3),
    };
  }, [searchByColumn, selectedByColumn, visibleLenses]);

  const metricValue = (lens: Lens): number => {
    const sellUsd = fxRate > 0 ? lens.sell_price / fxRate : 0;
    if (metric === "cost_usd") return lens.base_price;
    if (metric === "sell_usd") return sellUsd;
    if (metric === "sell_bbd") return lens.sell_price;
    if (lens.base_price <= 0) return 0;
    return ((sellUsd - lens.base_price) / lens.base_price) * 100;
  };

  const columnOneLens = selectedByColumn.get(1);

  const metricLabel = useMemo(() => {
    if (metric === "cost_usd") return "Cost (USD)";
    if (metric === "sell_usd") return "Sell (USD)";
    if (metric === "sell_bbd") return "Sell (BBD)";
    return "Markup %";
  }, [metric]);

  if (isMobile) {
    return <div className="h-full" />;
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <AdminPageHeader icon={Search} title="Supplier Lens Compare" />
        <div className="flex items-center gap-2">
          <Button variant={metric === "cost_usd" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setMetric("cost_usd")}>Cost</Button>
          <Button variant={metric === "sell_usd" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setMetric("sell_usd")}>Sell USD</Button>
          <Button variant={metric === "sell_bbd" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setMetric("sell_bbd")}>Sell BBD</Button>
          <Button variant={metric === "markup_percent" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setMetric("markup_percent")}>Markup %</Button>
          <Button variant={diffMode === "absolute" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setDiffMode("absolute")}>Δ Abs</Button>
          <Button variant={diffMode === "percent" ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setDiffMode("percent")}>Δ %</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 min-h-0 flex-1">
        {COLUMNS.map((column) => (
          <div key={column} className="border rounded-md flex flex-col min-h-0" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <div className="p-2 border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
              <div className="mb-2 flex items-center justify-between gap-1">
                <p className="text-xs font-semibold">Compare Column {column}</p>
                {column === 1 && (
                  <Button
                    type="button"
                    variant={linkedSearch ? "default" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1"
                    onClick={toggleLinkedSearch}
                    title={linkedSearch ? "Unlink search columns" : "Link search to columns 2 and 3"}
                  >
                    {linkedSearch ? <Link2 className="h-3 w-3" /> : <Unlink2 className="h-3 w-3" />}
                    {linkedSearch ? "Linked" : "Link Search"}
                  </Button>
                )}
              </div>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchByColumn[column]}
                  onChange={(event) => setSearchValue(column, event.target.value)}
                  placeholder="Search supplier / lens / type"
                  className="h-8 text-xs pl-8"
                  disabled={linkedSearch && column !== 1}
                />
              </div>
            </div>
            <div className="min-h-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px]">Lens</TableHead>
                    <TableHead className="text-[11px] text-right">Cost USD</TableHead>
                    <TableHead className="text-[11px] text-right">Sell USD</TableHead>
                    <TableHead className="text-[11px] text-right">Sell BBD</TableHead>
                    <TableHead className="text-[11px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-xs text-center py-4">Loading…</TableCell>
                    </TableRow>
                  ) : filteredByColumn[column].length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-xs text-center py-4 text-muted-foreground">No matches.</TableCell>
                    </TableRow>
                  ) : (
                    filteredByColumn[column].map((lens) => {
                      const sellUsd = fxRate > 0 ? lens.sell_price / fxRate : 0;
                      const preference = preferences[lens.id];
                      const supplierColor =
                        preference === "disliked"
                          ? "hsl(var(--admin-destructive))"
                          : preference === "liked"
                            ? "hsl(var(--admin-success))"
                            : "hsl(var(--foreground))";
                      return (
                        <TableRow key={`${column}-${lens.id}`}>
                          <TableCell className="text-xs align-top">
                            <p className="font-medium" style={{ color: supplierColor }}>{lens.name}</p>
                            <p className="text-[11px] text-muted-foreground">{lens.supplier?.name ?? "—"}</p>
                          </TableCell>
                          <TableCell className="text-xs text-right align-top">{currency(lens.base_price)}</TableCell>
                          <TableCell className="text-xs text-right align-top">{currency(sellUsd)}</TableCell>
                          <TableCell className="text-xs text-right align-top">{currency(lens.sell_price)}</TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => addLensToCompare(column, lens)} title="Add to compare">
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreference(lens.id, preference === "liked" ? null : "liked")} title="Like lens">
                                <ThumbsUp className="h-3 w-3" style={{ color: preference === "liked" ? "hsl(var(--admin-success))" : undefined }} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPreference(lens.id, preference === "disliked" ? null : "disliked")} title="Dislike lens">
                                <ThumbsDown className="h-3 w-3" style={{ color: preference === "disliked" ? "hsl(var(--admin-destructive))" : undefined }} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}

        <div className="border rounded-md flex flex-col min-h-0" style={{ borderColor: "hsl(var(--admin-border))" }}>
          <div className="p-2 border-b" style={{ borderColor: "hsl(var(--admin-border))" }}>
            <p className="text-xs font-semibold">Comparison Results</p>
            <p className="text-[11px] text-muted-foreground">Compare selected lenses across columns 1–3.</p>
          </div>
          <div className="min-h-0 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Column</TableHead>
                  <TableHead className="text-[11px]">Lens</TableHead>
                  <TableHead className="text-[11px] text-right">{metricLabel}</TableHead>
                  <TableHead className="text-[11px] text-right">vs Col 1</TableHead>
                  <TableHead className="text-[11px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.map((slot) => {
                  if (!slot.lens) {
                    return (
                      <TableRow key={`selected-${slot.column}`}>
                        <TableCell className="text-xs">Col {slot.column}</TableCell>
                        <TableCell colSpan={4} className="text-xs text-muted-foreground">No lens selected.</TableCell>
                      </TableRow>
                    );
                  }

                  const value = metricValue(slot.lens);
                  const baseline = columnOneLens ? metricValue(columnOneLens) : null;
                  const deltaAbs = baseline == null ? null : value - baseline;
                  const deltaPct = baseline == null || baseline === 0 ? null : ((value - baseline) / baseline) * 100;

                  let deltaLabel = "—";
                  if (slot.column !== 1 && baseline != null) {
                    if (diffMode === "absolute") {
                      deltaLabel = metric === "markup_percent" ? `${(deltaAbs ?? 0).toFixed(2)} pp` : currency(deltaAbs ?? 0);
                    } else {
                      deltaLabel = `${(deltaPct ?? 0).toFixed(2)}%`;
                    }
                  }

                  return (
                    <TableRow key={`selected-${slot.column}`}>
                      <TableCell className="text-xs">Col {slot.column}</TableCell>
                      <TableCell className="text-xs">
                        <p className="font-medium">{slot.lens.name}</p>
                        <p className="text-[11px] text-muted-foreground">{slot.lens.supplier?.name ?? "—"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        {metric === "markup_percent" ? `${value.toFixed(2)}%` : currency(value)}
                      </TableCell>
                      <TableCell className="text-xs text-right">{slot.column === 1 ? "Baseline" : deltaLabel}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelected((prev) => prev.map((entry) => (entry.column === slot.column ? { ...entry, lens: null } : entry)))} title="Remove lens from compare">
                          <X className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingComparePage;
  const setSearchValue = (column: 1 | 2 | 3, value: string) => {
    setSearchByColumn((prev) => {
      if (linkedSearch && column === 1) {
        return { 1: value, 2: value, 3: value };
      }
      return { ...prev, [column]: value };
    });
  };

  const toggleLinkedSearch = () => {
    setLinkedSearch((prev) => {
      const next = !prev;
      if (next) {
        setSearchByColumn((current) => ({ 1: current[1], 2: current[1], 3: current[1] }));
      }
      return next;
    });
  };

  const addLensToCompare = (column: 1 | 2 | 3, lens: Lens) => {
    setSelected((prev) =>
      prev.map((slot) => {
        if (slot.column === column) return { ...slot, lens };
        if (slot.lens?.id === lens.id) return { ...slot, lens: null };
        return slot;
      })
    );
  };
