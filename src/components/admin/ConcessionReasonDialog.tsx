import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CONCESSION_REASONS } from "@/hooks/useGovernanceCheck";

interface Props {
  open: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

const ConcessionReasonDialog = ({ open, onConfirm, onCancel }: Props) => {
  const [selected, setSelected] = useState<string>("");
  const [otherText, setOtherText] = useState("");

  const reason = selected === "Other" ? (otherText.trim() || "Other") : selected;
  const isValid = !!selected && (selected !== "Other" || otherText.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <DialogTitle className="text-sm" style={{ color: "hsl(215 30% 15%)" }}>
            Price Below Strategic — Reason Required
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          The sell price is below the strategic price. Please select a reason to proceed.
        </p>
        <RadioGroup value={selected} onValueChange={setSelected} className="space-y-2 mt-2">
          {CONCESSION_REASONS.map((r) => (
            <div key={r} className="flex items-center gap-2">
              <RadioGroupItem value={r} id={`reason-${r}`} />
              <Label htmlFor={`reason-${r}`} className="text-xs cursor-pointer">{r}</Label>
            </div>
          ))}
        </RadioGroup>
        {selected === "Other" && (
          <Textarea
            className="text-xs mt-2 min-h-[50px]"
            placeholder="Enter reason…"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
          />
        )}
        <DialogFooter className="gap-2 mt-3">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onCancel}>Cancel</Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-xs"
            style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            disabled={!isValid}
            onClick={() => onConfirm(reason)}
          >
            Confirm & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConcessionReasonDialog;
