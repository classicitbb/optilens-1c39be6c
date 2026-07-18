import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Calculator, CheckCircle2, Info, Loader2 } from "lucide-react";
import MarginBadge from "./MarginBadge";

const OVERRIDE_REASONS = [
  "Competitive match",
  "Customer retention",
  "Volume deal",
  "Management override",
  "Other",
] as const;

interface LineOverrideDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** The pricelist version id — used to find the child_section_id */
  versionId: number | null;
  /** e.g. "RX Lens Prices", "Stock Lens Prices", "Supplies Prices" */
  sectionType: string;
  /** The item reference type: "lens" | "addon" | "supply" */
  referenceType: string;
  /** The item id */
  referenceId: string;
  /** Display name */
  itemName: string;
  /** Cost from the source table */
  cost: number | null;
  /** Current sell price (before override) */
  currentPrice: number | null;
  /** Configurable margin floor percentage (default 20) */
  marginFloor?: number;
  context?: {
    cellLabel?: string;
    sourceLabel?: string;
    inclusionMode?: "auto" | "manual" | "list";
    supplierLabel?: string | null;
    notes?: string[];
  };
}

const LineOverrideDialog = ({
  open,
  onOpenChange,
  versionId,
  sectionType,
  referenceType,
  referenceId,
  itemName,
  cost,
  currentPrice,
  marginFloor = 20,
  context,
}: LineOverrideDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [overridePrice, setOverridePrice] = useState("");
  const [reason, setReason] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);

  // Load existing override
  useEffect(() => {
    if (!open || !versionId) return;
    (async () => {
      // Find child section id
      const { data: sections } = await (supabase.from("pricelist_child_sections") as any)
        .select("id")
        .eq("pricelist_version_id", versionId)
        .eq("section_type", sectionType);

      if (!sections?.length) return;
      const sectionIds = (sections as any[]).map((s: any) => s.id);

      const { data: existing } = await (supabase.from("pricelist_line_overrides") as any)
        .select("*")
        .eq("reference_type", referenceType)
        .eq("reference_id", referenceId)
        .in("child_section_id", sectionIds)
        .maybeSingle();

      if (existing) {
        setOverridePrice(String((existing as any).overridden_price_bbd ?? ""));
        setReason((existing as any).reason ?? "");
        setExistingId((existing as any).id);
      } else {
        setOverridePrice(String(currentPrice ?? ""));
        setReason("");
        setExistingId(null);
      }
    })();
  }, [open, versionId, sectionType, referenceType, referenceId, currentPrice]);

  const parsedPrice = parseFloat(overridePrice) || null;
  const currentMargin =
    currentPrice && cost && cost > 0
      ? ((currentPrice - cost) / currentPrice) * 100
      : null;
  const margin =
    parsedPrice && cost && cost > 0
      ? ((parsedPrice - cost) / parsedPrice) * 100
      : null;
  const priceDelta = parsedPrice != null && currentPrice != null ? parsedPrice - currentPrice : null;
  const floorPasses = margin == null || margin >= marginFloor;
  const isMatrixAllocation = referenceType === "matrix_allocation";
  const contextNotes = context?.notes?.length
    ? context.notes
    : isMatrixAllocation
      ? [
          "Auto Price can fill empty cells from active, approved, positive-cost lens rows that classify into this grouping, category, and material.",
          "Manual lens selection remains available from the matrix search control and is not changed by a price override.",
          "Manual price overrides save only this cell's sell price; they do not relink the lens or remove the auto-pricing path.",
        ]
      : [
          "The list editor keeps its linked item selection and uses this dialog only for line-level price overrides.",
          "Manual price overrides do not change the underlying catalog item cost or default sell price.",
        ];

  const handleSave = async () => {
    if (!versionId || parsedPrice == null) return;
    setSaving(true);
    try {
      // Ensure child section exists
      const { data: sections } = await (supabase.from("pricelist_child_sections") as any)
        .select("id")
        .eq("pricelist_version_id", versionId)
        .eq("section_type", sectionType);

      let childSectionId: number;
      if (sections && sections.length > 0) {
        childSectionId = (sections as any[])[0].id;
      } else {
        const { data: newSec, error: secErr } = await (supabase.from("pricelist_child_sections") as any)
          .insert({
            pricelist_version_id: versionId,
            section_type: sectionType,
            child_markup_percent: 0,
            child_discount_percent: 0,
          })
          .select("id")
          .single();
        if (secErr) throw secErr;
        childSectionId = (newSec as any).id;
      }

      if (existingId) {
        const { error } = await (supabase.from("pricelist_line_overrides") as any)
          .update({
            overridden_price_bbd: parsedPrice,
            reason: reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("pricelist_line_overrides") as any)
          .insert({
            child_section_id: childSectionId,
            reference_type: referenceType,
            reference_id: referenceId,
            overridden_price_bbd: parsedPrice,
            reason: reason || null,
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["pricelist-line-overrides"] });
      toast({ title: "Override saved" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!existingId) return;
    setSaving(true);
    try {
      const { error } = await (supabase.from("pricelist_line_overrides") as any)
        .delete()
        .eq("id", existingId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["pricelist-line-overrides"] });
      toast({ title: "Override removed" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Line Price Override
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground truncate">{itemName}</p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="rounded px-1.5 py-0 text-[10px]">
                {isMatrixAllocation ? "Matrix cell" : "List line"}
              </Badge>
              {context?.cellLabel && <span>{context.cellLabel}</span>}
              {context?.supplierLabel && <span>Supplier: {context.supplierLabel}</span>}
              {context?.sourceLabel && <span>Source: {context.sourceLabel}</span>}
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Info className="h-3 w-3 text-primary" />
                Inclusion
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {context?.inclusionMode === "manual"
                  ? "Linked manually from the matrix."
                  : context?.inclusionMode === "list"
                    ? "Linked from the list editor."
                    : isMatrixAllocation
                      ? "Eligible for Auto Price, but still manually editable."
                      : "Line-level catalog item."}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                <Calculator className="h-3 w-3 text-primary" />
                Current basis
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Cost {cost != null ? `$${cost.toFixed(2)}` : "not available"}; current margin {currentMargin != null ? `${currentMargin.toFixed(1)}%` : "not available"}.
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
                {floorPasses ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <AlertTriangle className="h-3 w-3 text-red-600" />}
                Floor check
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {margin != null
                  ? `${margin.toFixed(1)}% margin vs ${marginFloor}% floor`
                  : `Floor is ${marginFloor}%; enter a price to evaluate.`}
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden">
            <div className="bg-muted/50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pricing walkthrough
            </div>
            <div className="divide-y divide-border text-xs">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground">Cost basis</span>
                <span className="font-mono text-foreground">{cost != null ? `$${cost.toFixed(2)} BBD` : "Unavailable"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground">Current price</span>
                <span className="font-mono text-foreground">{currentPrice != null ? `$${currentPrice.toFixed(2)} BBD` : "Unavailable"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground">Override price</span>
                <span className="font-mono font-semibold text-foreground">{parsedPrice != null ? `$${parsedPrice.toFixed(2)} BBD` : "Not set"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-muted-foreground">Change from current</span>
                <span className={priceDelta != null && priceDelta < 0 ? "font-mono text-red-600" : "font-mono text-emerald-600"}>
                  {priceDelta != null ? `${priceDelta >= 0 ? "+" : "-"}$${Math.abs(priceDelta).toFixed(2)}` : "Unavailable"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
                Cost (BBD)
              </label>
              <Input
                value={cost != null ? cost.toFixed(2) : "—"}
                disabled
                className="h-7 text-xs text-left bg-muted/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
                Current Price (BBD)
              </label>
              <Input
                value={currentPrice != null ? currentPrice.toFixed(2) : "—"}
                disabled
                className="h-7 text-xs text-left bg-muted/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
              Override Price (BBD)
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                className="h-8 text-xs text-left flex-1"
                placeholder="Enter override price"
              />
              <MarginBadge
                marginPercent={margin != null ? parseFloat(margin.toFixed(1)) : null}
                cost={cost}
                sellPrice={parsedPrice}
                itemName={itemName}
                marginFloor={marginFloor}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/10 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Inclusion logic
            </div>
            <ul className="mt-2 space-y-1.5">
              {contextNotes.map((note) => (
                <li key={note} className="flex gap-2 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
              Reason
            </label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {OVERRIDE_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {margin != null && margin < marginFloor && (
            <div
              className="flex items-center gap-1.5 rounded px-2 py-1.5"
              style={{
                background: "hsl(0 60% 95%)",
                color: "hsl(0 60% 40%)",
                border: "1px solid hsl(0 60% 85%)",
              }}
            >
              <span className="text-[10px] font-medium">
                ⚠ This price results in a margin below {marginFloor}%. A reason is
                required.
              </span>
            </div>
          )}

          <div className="rounded-md border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-200">
            <div className="font-semibold uppercase tracking-wide">Business basis</div>
            <p className="mt-1">
              Standard matrix pricing is designed to cover the most expensive available approved supplier at the configured floor margin. A manual override is allowed, but below-floor overrides require a reason so the pricing decision is visible later.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {existingId && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-destructive"
              onClick={handleClear}
              disabled={saving}
            >
              Remove Override
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            style={{ background: "hsl(215 65% 50%)", color: "white" }}
            onClick={handleSave}
            disabled={
              saving ||
              parsedPrice == null ||
              (margin != null && margin < marginFloor && !reason)
            }
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LineOverrideDialog;
