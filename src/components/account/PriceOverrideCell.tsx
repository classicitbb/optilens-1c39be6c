import { useState } from "react";
import { Check, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PriceOverrideCellProps {
  wholesaleDisplay: string;
  pricesHidden: boolean;
  override?: { custom_price: number; currency_code: string };
  onSave: (price: number) => void;
  onClear: () => void;
  isSaving?: boolean;
}

const formatOverride = (price: number, currencyCode: string) => `${currencyCode} $${price.toFixed(2)}`;

// A wholesale price cell that a portal user can replace with their own
// retail price — once set, the override always shows in place of the
// wholesale figure, regardless of the page's Show/Hide toggle, since it's
// the user's own data rather than the sensitive wholesale cost.
const PriceOverrideCell = ({ wholesaleDisplay, pricesHidden, override, onSave, onClear, isSaving }: PriceOverrideCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    const parsed = Number(draft);
    const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
    const commit = () => {
      if (!valid) return;
      onSave(parsed);
      setEditing(false);
    };
    return (
      <div className="flex items-center justify-end gap-1">
        <Input
          type="number"
          min="0"
          step="0.01"
          autoFocus
          placeholder="0.00"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
            if (event.key === "Escape") setEditing(false);
          }}
          className="h-7 w-24 text-right"
        />
        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" disabled={!valid || isSaving} onClick={commit}>
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (override) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span className="font-semibold text-foreground">{formatOverride(override.custom_price, override.currency_code)}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Edit your price"
          onClick={() => {
            setDraft(String(override.custom_price));
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          title="Remove your price"
          onClick={onClear}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-end gap-1.5">
      <span className={cn(pricesHidden && "select-none blur-sm")}>{wholesaleDisplay}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        title="Enter your own retail price"
        onClick={() => {
          setDraft("");
          setEditing(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default PriceOverrideCell;
