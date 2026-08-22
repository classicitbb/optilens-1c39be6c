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
  // When the caller makes an ancestor row itself hoverable/clickable (e.g. a
  // whole "Add to Cart" table row), pass true so this cell defers to that
  // row's hover group instead of declaring its own — otherwise hovering
  // anywhere but this cell wouldn't reveal the action icon.
  useRowHoverGroup?: boolean;
  // Material matrix columns are centered, unlike the right-aligned catalog
  // price columns. Keep the displayed amount centered even when edit actions
  // are available at the edge of the cell.
  centered?: boolean;
}

const formatOverride = (price: number, currencyCode: string) => `${currencyCode} $${price.toFixed(2)}`;

const hoverActionSurfaceClass =
  "flex items-center gap-0.5 rounded-md border border-border/70 bg-background/95 p-0.5 shadow-md backdrop-blur-sm opacity-0 pointer-events-none transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100";

// Every interactive control in this cell stops propagation — it may sit
// inside a clickable row (whole-row "Add to Cart"), and editing/clearing an
// override must never also trigger that row's click action.
const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

const ActionButton = ({ action }: { action: PriceOverrideCellAction }) => (
  <Button
    type="button"
    size="icon"
    variant="ghost"
    className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100 focus-visible:opacity-100"
    title={action.type === "cart" ? "Add to cart" : "Add to Rx quote request"}
    onClick={(event) => {
      stop(event);
      action.onClick();
    }}
  >
    {action.type === "cart" ? <ShoppingCart className="h-3.5 w-3.5" /> : <FileSignature className="h-3.5 w-3.5" />}
  </Button>
);

// A wholesale price cell that a portal user can replace with their own
// retail price. The override only stands in for the *blur* — it shows
// whenever prices are hidden, but "Show prices" means "show the real
// supplier price," so it takes priority over any override while active.
const PriceOverrideCell = ({
  wholesaleDisplay,
  pricesHidden,
  override,
  onSave,
  onClear,
  isSaving,
  action,
  useRowHoverGroup,
  centered = false,
}: PriceOverrideCellProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const groupClass = useRowHoverGroup ? "" : "group";

  if (editing) {
    const parsed = Number(draft);
    const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
    const commit = () => {
      if (!valid) return;
      onSave(parsed);
      setEditing(false);
    };
    return (
      <div className={cn("flex items-center gap-1", centered ? "relative justify-center" : "justify-end")} onClick={stop}>
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
        <div className={cn("flex items-center gap-1", centered && "absolute right-0")}>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" disabled={!valid || isSaving} onClick={commit}>
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  if (override && pricesHidden) {
    return (
      <div className={cn("flex items-center gap-1.5", centered ? "relative justify-center" : "justify-end", groupClass)}>
        <span className="font-semibold text-foreground">{formatOverride(override.custom_price, override.currency_code)}</span>
        <div className={cn(hoverActionSurfaceClass, centered && "absolute right-0")}>
          {action && <ActionButton action={action} />}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Edit your price"
            onClick={(event) => {
              stop(event);
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
            onClick={(event) => {
              stop(event);
              onClear();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // No override, or "Show prices" is active — show the real wholesale
  // price. When an override exists but is being superseded by Show prices,
  // the pencil edits the existing value instead of starting blank, and the
  // remove control stays reachable without needing to hide prices again.
  return (
    <div className={cn("flex items-center gap-1.5", centered ? "relative justify-center" : "justify-end", groupClass)}>
      <span className={cn(pricesHidden && "select-none blur-sm")}>{wholesaleDisplay}</span>
      <div className={cn(hoverActionSurfaceClass, centered && "absolute right-0")}>
        {action && <ActionButton action={action} />}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          title={override ? "Edit your price" : "Enter your own retail price"}
          onClick={(event) => {
            stop(event);
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
            onClick={(event) => {
              stop(event);
              onClear();
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default PriceOverrideCell;
