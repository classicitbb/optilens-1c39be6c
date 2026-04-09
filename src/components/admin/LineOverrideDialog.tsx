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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
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
      const { data: sections } = await (supabase
        .from("pricelist_child_sections") as any)
        .select("id")
        .eq("pricelist_version_id", versionId)
        .eq("section_type", sectionType);

      if (!sections?.length) return;
      const sectionIds = (sections as any[]).map((s: any) => s.id);

      const { data: existing } = await (supabase
        .from("pricelist_line_overrides") as any)
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
  const margin =
    parsedPrice && cost && cost > 0
      ? ((parsedPrice - cost) / parsedPrice) * 100
      : null;

  const handleSave = async () => {
    if (!versionId || parsedPrice == null) return;
    setSaving(true);
    try {
      // Ensure child section exists
      const { data: sections } = await (supabase
        .from("pricelist_child_sections") as any)
        .select("id")
        .eq("pricelist_version_id", versionId)
        .eq("section_type", sectionType);

      let childSectionId: number;
      if (sections && sections.length > 0) {
        childSectionId = (sections as any[])[0].id;
      } else {
        const { data: newSec, error: secErr } = await (supabase
          .from("pricelist_child_sections") as any)
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
        const { error } = await (supabase
          .from("pricelist_line_overrides") as any)
          .update({
            overridden_price_bbd: parsedPrice,
            reason: reason || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("pricelist_line_overrides") as any)
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
      const { error } = await (supabase
        .from("pricelist_line_overrides") as any)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            Line Price Override
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground truncate">{itemName}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
                Cost (BBD)
              </label>
              <Input
                value={cost != null ? cost.toFixed(2) : "—"}
                disabled
                className="h-7 text-xs text-right bg-muted/30"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium mb-1 block text-muted-foreground">
                Current Price (BBD)
              </label>
              <Input
                value={currentPrice != null ? currentPrice.toFixed(2) : "—"}
                disabled
                className="h-7 text-xs text-right bg-muted/30"
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
                className="h-8 text-xs text-right flex-1"
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
