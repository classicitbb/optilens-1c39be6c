import { useState } from "react";
import { Check, FileSignature, Pencil, RotateCcw, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PriceOverrideCellAction {
  type: "cart" | "rx";
  onClick: () => void;
}

interface PriceOverrideCellProps {
  wholesaleDisplay: string;
  pricesHidden: boolean;
  override?: { custom_price: number; currency_code: string };
  onSave: (price: number) => void;
  onClear: () => void;
  isSaving?: boolean;
  // Independent of the price-override concern above — lets a row also offer
  // a hover-revealed "add to cart" / "add to Rx" action, e.g. for stock
  // lenses/supplies (cart) vs RX lens designs and add-ons (Rx quote request).
  action?: PriceOverrideCellAction;
}

const formatOverride = (price: number, currencyCode: string) => `${currencyCode} $${price.toFixed(2)}`;

const ActionButton = ({ action }: { action: PriceOverrideCellAction }) => (
  <Button
    type="button"
    size="icon"
    variant="ghost"
    className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
    title={action.type === "cart" ? "Add to cart" : "Add to Rx quote request"}
    onClick={action.onClick}
  >
    {action.type === "cart" ? <ShoppingCart className="h-3.5 w-3.5" /> : <FileSignature className="h-3.5 w-3.5" />}
  </Button>
);

// A wholesale price cell that a portal user can replace with their own
// retail price. The override only stands in for the *blur* — it shows
// whenever prices are hidden, but "Show prices" means "show the real
// supplier price," so it takes priority over any override while active.
const PriceOverrideCell = ({ wholesaleDisplay, pricesHidden, override, onSave, onClear, isSaving, action }: PriceOverrideCellProps) => {
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

  if (override && pricesHidden) {
    return (
      <div className="group flex items-center justify-end gap-1.5">
        <span className="font-semibold text-foreground">{formatOverride(override.custom_price, override.currency_code)}</span>
        {action && <ActionButton action={action} />}
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

  // No override, or "Show prices" is active — show the real wholesale
  // price. When an override exists but is being superseded by Show prices,
  // the pencil edits the existing value instead of starting blank, and the
  // remove control stays reachable without needing to hide prices again.
  return (
    <div className="group flex items-center justify-end gap-1.5">
      <span className={cn(pricesHidden && "select-none blur-sm")}>{wholesaleDisplay}</span>
      {action && <ActionButton action={action} />}
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        title={override ? "Edit your price" : "Enter your own retail price"}
        onClick={() => {
          setDraft(override ? String(override.custom_price) : "");
          setEditing(true);
        }}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {override && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
          title="Remove your price"
          onClick={onClear}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};

export default PriceOverrideCell;
