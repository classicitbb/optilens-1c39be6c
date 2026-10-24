import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sellingMargin } from "./marginEstimate";

export function GrossMarginEstimate({ costBBD }: { costBBD: number }) {
  const id = useId();
  const [sellingPrice, setSellingPrice] = useState("");
  const estimate = sellingMargin(costBBD, sellingPrice);
  const invalid = sellingPrice.trim() !== "" && estimate === null;
  return (
    <div className="space-y-2 border-t px-4 py-3 text-xs">
      <Label htmlFor={id} className="text-xs font-semibold">Your selling price (BBD)</Label>
      <p id={`${id}-help`} className="text-muted-foreground">Enter your selling price to see your estimated gross margin.</p>
      <Input id={id} type="text" inputMode="decimal" placeholder="0.00" value={sellingPrice}
        onChange={(event) => setSellingPrice(event.target.value)}
        aria-describedby={`${id}-help ${id}-note${invalid ? ` ${id}-error` : ""}`} aria-invalid={invalid}
        className="h-9 text-right tabular-nums" />
      {invalid && <p id={`${id}-error`} className="text-destructive">Enter a positive amount or zero, with up to two decimal places.</p>}
      {estimate && (
        <div className="space-y-1" role="status" aria-live="polite">
          <div className="flex justify-between gap-2"><span>Estimated gross profit</span><b className={estimate.profitBBD < 0 ? "text-red-700 dark:text-red-300" : ""}>BBD $ {estimate.profitBBD.toFixed(2)}</b></div>
          <div className="flex justify-between gap-2"><span>Gross margin</span><b>{estimate.marginPercent === null ? "— (zero selling price)" : `${estimate.marginPercent.toFixed(1)}%`}</b></div>
        </div>
      )}
      <p id={`${id}-note`} className="text-[11px] text-muted-foreground">Lens order only, on the same tax basis as the quote. Excludes frames and other costs. This estimate is not saved or sent with your order.</p>
    </div>
  );
}
