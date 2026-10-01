// The live quote and the "before you can submit" checklist. On a phone it
// collapses to a bottom bar with the total and the submit button.
import { Check, Flag, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { Derived, SectionId } from "./model";
import type { RxCatalog } from "./types";

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function QuotePanel({
  derived, catalog, eyes, onGo, onRemoveCoating, onRemoveAssistance,
}: {
  derived: Derived;
  catalog: RxCatalog;
  eyes: "pair" | "od" | "os";
  onGo: (id: SectionId) => void;
  onRemoveCoating: (id: string) => void;
  onRemoveAssistance: (text: string) => void;
}) {
  const { price, checklist, assistance } = derived;
  const show = catalog.pricesVisible;
  const onRequest = show && price.unpriced;
  const total = show ? (onRequest ? "on request" : money(price.sub)) : "——";
  const sub = !show ? "confirmed with you before production"
    : !price.ready ? "choose a lens to start pricing"
    : price.unpriced ? (catalog.blockUnpricedOrders
      ? "this lens is not on your pricelist — save as a draft and we will quote it"
      : "this lens is not on your pricelist — you can still order it and it will be priced when processed")
    : `${eyes === "pair" ? "per pair" : eyes === "od" ? "right lens only" : "left lens only"} · updates as you type`;
  const done = checklist.filter((c) => c.ok).length;

  return (
    <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start" aria-label="Order quote">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{show ? "Live quote · BBD" : "Order summary"}</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums" aria-live="polite">
            {show && !onRequest && <span className="mr-1 text-sm font-medium text-muted-foreground">BBD $</span>}{total}
          </p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
        {!show && (
          <p className="border-b px-4 py-3 text-xs">
            <b>Your order details are ready to review.</b> You can complete and submit this order as normal. We will confirm the final order details before production.
          </p>
        )}
        <div className="divide-y text-xs">
          {!price.ready ? (
            <p className="px-4 py-3 text-muted-foreground">No lens chosen yet — the quote fills in as you select.</p>
          ) : price.lines.map((l, i) => (
            <div key={`${l.n}-${i}`} className="flex items-start justify-between gap-3 px-4 py-2">
              <span className="min-w-0">
                <b className="flex items-center gap-1 font-medium">
                  {l.n}
                  {l.treatmentId && (
                    <button type="button" aria-label={`Remove ${l.n} from order`} title="Remove from order"
                      className="text-muted-foreground hover:text-foreground" onClick={() => onRemoveCoating(l.treatmentId!)}>
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </b>
                <i className="block not-italic text-muted-foreground">{l.i}</i>
              </span>
              <span className="shrink-0 tabular-nums">{l.unpriced ? "on request" : show ? money(l.v) : "••••"}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1 border-t bg-muted/20 px-4 py-3 text-xs">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{show ? (onRequest ? "on request" : `BBD $ ${money(price.sub)}`) : "——"}</span></div>
          <div className="flex justify-between text-sm font-semibold"><span>Order total</span><span className="tabular-nums">{show ? (onRequest ? "on request" : `BBD $ ${money(price.sub)}`) : "——"}</span></div>
        </div>
        {assistance.length > 0 && (
          <div className="flex items-start gap-2 border-t bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
            <Flag className="mt-0.5 h-3 w-3" /><span>{price.unpriced ? "Priced when processed — flagged for follow-up." : "Flagged for assistance."}</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h3 className="text-xs font-semibold">Before you can submit</h3>
        <ul className="mt-2 space-y-1">
          {checklist.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onGo(c.id)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-muted/50">
                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", c.ok && "border-emerald-600 bg-emerald-600 text-white")}>
                  {c.ok && <Check className="h-3 w-3" />}
                </span>
                <span className={cn(c.ok && "text-muted-foreground")}>{c.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <Progress value={Math.round((done / checklist.length) * 100)} className="mt-3 h-1.5" aria-label="Order completion" />
        {assistance.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            <h4 className="flex items-center gap-1 text-[11px] font-semibold"><Flag className="h-3 w-3" /> Flagged for assistance</h4>
            {assistance.map((a) => (
              <p key={a} className="flex items-start justify-between gap-2 rounded bg-muted/50 px-2 py-1 text-[11px]">
                <span>{a}</span>
                {a !== "Lens not priced on this account — quote requested" && (
                  <button type="button" aria-label={`Remove flag: ${a}`} onClick={() => onRemoveAssistance(a)}><X className="h-3 w-3" /></button>
                )}
              </p>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
