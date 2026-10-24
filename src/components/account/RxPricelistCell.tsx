import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { formatPricelistMoney } from "./pricelistCurrencies";
import type { PricelistLens } from "@/features/rx-order/pricing/pricelistLenses";
import PriceOverrideCell from "./PriceOverrideCell";

interface Props {
  context: string;
  lenses: PricelistLens[];
  catalogLoading: boolean;
  catalogError: boolean;
  price: number | null;
  wholesaleDisplay: string;
  pricesHidden: boolean;
  currency: string;
  currencyIndicative?: boolean;
  override?: { custom_price: number; currency_code: string };
  onSave: (price: number) => void;
  onClear: () => void;
  isSaving: boolean;
  readOnly: boolean;
  canStartOrder: boolean;
  onStartOrder: (lens: PricelistLens) => void;
  onRequestQuote: (description: string) => void;
}

/** One focusable/tappable price, with hover details and all actions together. */
export function RxPricelistCell(props: Props) {
  const [open, setOpen] = useState(false);
  const [selectedAlias, setSelectedAlias] = useState("");
  const selected = props.lenses.length === 1 ? props.lenses[0] : props.lenses.find((lens) => lens.alias === selectedAlias);
  const id = useId();
  const content = useRef<HTMLDivElement>(null);
  const hoverOpened = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelClose = () => { clearTimeout(closeTimer.current); };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const leave = () => {
    cancelClose();
    if (!hoverOpened.current) return;
    closeTimer.current = setTimeout(() => {
      // Keep an active selector/editor open while the pointer moves away.
      if (!content.current?.contains(document.activeElement)) setOpen(false);
    }, 200);
  };
  const lensDescription = selected ? `${selected.material} — ${selected.design} — ${selected.colour}` : props.context;
  const retailPrice = props.pricesHidden ? props.override : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Lens details: ${props.context}`}
          className="min-h-11 w-full touch-manipulation rounded-sm px-1 py-1 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerEnter={(event) => {
            if (event.pointerType !== "mouse") return;
            // Do not interrupt someone editing or keyboard-navigating another cell.
            if (document.activeElement?.closest("[data-rx-pricelist-popup]")) return;
            cancelClose(); hoverOpened.current = true; setOpen(true);
          }}
          onPointerLeave={(event) => { if (event.pointerType === "mouse") leave(); }}
          onClick={(event) => {
            event.preventDefault();
            cancelClose();
            const close = open && !hoverOpened.current;
            hoverOpened.current = false;
            setOpen(!close);
            if (!close && open) content.current?.querySelector<HTMLElement>("select, input, button")?.focus({ preventScroll: true });
          }}
        >
          {props.price == null ? <span aria-label="Not offered on this pricelist">—</span>
            : retailPrice ? `${retailPrice.currency_code} ${formatPricelistMoney(retailPrice.custom_price, retailPrice.currency_code)}`
              : <span className={cn(props.pricesHidden && "select-none blur-sm")}>{props.wholesaleDisplay}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={content}
        data-rx-pricelist-popup
        aria-labelledby={`${id}-title`}
        collisionPadding={16}
        className="w-[min(20rem,calc(100vw-2rem))] max-h-[min(28rem,var(--radix-popover-content-available-height))] overflow-y-auto space-y-2 p-3 text-left text-sm font-normal"
        onMouseEnter={cancelClose}
        onMouseLeave={leave}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (!hoverOpened.current) (content.current?.querySelector<HTMLElement>("select, input") ?? content.current?.querySelector<HTMLElement>("button"))?.focus({ preventScroll: true });
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 id={`${id}-title`} className="font-semibold">Lens details</h4>
          <Button type="button" size="icon" variant="ghost" className="-my-2 -mr-2 h-11 w-11 shrink-0" aria-label="Close lens details" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
        </div>
        {props.catalogLoading ? <p role="status" className="text-xs text-muted-foreground">Loading lens options…</p>
          : props.catalogError ? <p role="alert" className="text-xs text-destructive">Lens options could not be loaded. Please try again.</p>
            : props.lenses.length === 0 ? <p className="text-xs text-muted-foreground">No matching lens is currently listed in the Rx order form.</p>
              : (
                <>
                  {props.lenses.length > 1 && (
                    <div className="space-y-1">
                      <label htmlFor={`${id}-lens`} className="text-xs font-medium">Choose a lens ({props.lenses.length} options at this price)</label>
                      <select id={`${id}-lens`} value={selectedAlias} onChange={(event) => setSelectedAlias(event.target.value)} className="h-9 w-full min-w-0 rounded-md border bg-background px-2 text-xs text-foreground">
                        <option value="">Choose the lens you want…</option>
                        {props.lenses.map((lens) => <option key={lens.alias} value={lens.alias}>{lens.material} — {lens.design} — {lens.colour}</option>)}
                      </select>
                    </div>
                  )}
                  {selected && (
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Material / index</dt><dd className="break-words text-right font-medium">{selected.material}</dd>
                      <dt className="text-muted-foreground">Lens design / type</dt><dd className="break-words text-right font-medium">{selected.design}</dd>
                      <dt className="text-muted-foreground">Lens colour option</dt><dd className="break-words text-right font-medium">{selected.colour}</dd>
                    </dl>
                  )}
                </>
              )}
        {props.price == null ? (
          <p className="text-xs text-muted-foreground">Not offered on this pricelist. This combination may be unavailable from our suppliers or left out because it is rarely ordered. Ask us to confirm the reason or suggest an alternative.</p>
        ) : (
          <div className="space-y-1 border-t pt-2">
            <p className="text-xs text-muted-foreground">Price per pair · {props.currency}{props.currencyIndicative ? " · estimate" : ""}{props.pricesHidden ? " · wholesale hidden" : " · wholesale"}</p>
            <PriceOverrideCell
              wholesaleDisplay={props.wholesaleDisplay} pricesHidden={props.pricesHidden} override={props.override}
              onSave={props.onSave} onClear={props.onClear} isSaving={props.isSaving} readOnly={props.readOnly} controlsVisible
            />
            {!props.readOnly && <p className="text-[11px] text-muted-foreground">Edit your retail display price. Orders use wholesale.</p>}
          </div>
        )}
        {!props.readOnly && (
          <div className="border-t pt-2">
            {props.canStartOrder && props.price != null ? (
              <>
                <Button type="button" size="sm" className="min-h-11 w-full" disabled={!selected || props.catalogLoading || props.catalogError} onClick={() => { if (selected) { setOpen(false); props.onStartOrder(selected); } }}>Start Rx order</Button>
                <p className="mt-1 text-[11px] text-muted-foreground">Opens a new draft with this lens selected.</p>
                {(props.catalogError || (!props.catalogLoading && props.lenses.length === 0)) && (
                  <Button type="button" variant="outline" size="sm" className="mt-2 min-h-11 w-full" onClick={() => { setOpen(false); props.onRequestQuote(props.context); }}>Request help matching this lens</Button>
                )}
              </>
            ) : <Button type="button" variant="outline" size="sm" className="min-h-11 w-full" onClick={() => { setOpen(false); props.onRequestQuote(lensDescription); }}>Request a quote</Button>}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
