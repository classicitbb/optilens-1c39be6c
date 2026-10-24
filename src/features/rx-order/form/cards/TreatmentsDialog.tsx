// The all-treatments picker, as a modal: categories on the left, a searchable
// grid of option cards on the right, and a footer that shows what is chosen.
// Clashes are explained on the card where they happen.
import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { clashOf } from "../model";
import type { CatalogTreatment, RxCatalog } from "../types";
import { CONTROL } from "../ui";
import type { RxFormApi } from "../useRxOrderForm";

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** One selectable treatment (used on the card's popular row and in the modal). */
export function TreatmentOption({
  t, selected, why, showPrice, onToggle,
}: {
  t: CatalogTreatment;
  selected: boolean;
  /** Why it cannot be added, or "Replaces X". */
  why: string | null;
  showPrice: boolean;
  onToggle: () => void;
}) {
  const blocked = !selected && !!why && !why.startsWith("Replaces");
  return (
    <button
      type="button" onClick={onToggle} aria-pressed={selected} disabled={blocked} title={why ?? undefined} data-tid={t.id}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left text-xs transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-foreground/30 hover:bg-muted/40",
        blocked && "cursor-not-allowed opacity-50",
      )}
    >
      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", selected && "border-primary bg-primary text-primary-foreground")}>
        {selected && <Check className="h-3 w-3" />}
      </span>
      <span className="min-w-0 flex-1">
        <b className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium">
          {t.n}
          {t.pop && <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-medium">Popular</Badge>}
        </b>
        {t.d && <span className="mt-0.5 block text-muted-foreground">{t.d}</span>}
        {!selected && why && <span className="mt-1 block text-[11px] text-amber-700 dark:text-amber-300">{why}</span>}
      </span>
      {showPrice && (
        <span className="shrink-0 text-right tabular-nums">
          {t.unpriced ? <span className="text-muted-foreground">on request</span> : <><b className="font-semibold">+{money(t.p)}</b><span className="block text-[10px] text-muted-foreground">per pair</span></>}
        </span>
      )}
    </button>
  );
}

export function TreatmentsDialog({
  open, onOpenChange, catalog, api, sideColours, notify,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalog: RxCatalog;
  api: RxFormApi;
  sideColours: string[];
  notify: (m: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const selected = new Set(api.values.treatments);

  const categories = useMemo(() => {
    const names = [...new Set(catalog.treatments.map((t) => t.c))];
    return names.map((name) => ({
      name,
      total: catalog.treatments.filter((t) => t.c === name).length,
      chosen: catalog.treatments.filter((t) => t.c === name && selected.has(t.id)).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.treatments, api.values.treatments]);

  const q = query.trim().toLowerCase();
  const visible = catalog.treatments.filter(
    (t) => (category === "all" || t.c === category) && (!q || `${t.n} ${t.c} ${t.d}`.toLowerCase().includes(q)),
  );
  const groups = [...new Set(visible.map((t) => t.c))];
  const chosen = api.values.treatments.map((id) => catalog.treatments.find((t) => t.id === id)).filter((t): t is CatalogTreatment => !!t);
  const chosenTotal = chosen.reduce((s, t) => s + (t.unpriced ? 0 : t.p), 0);

  const toggle = (id: string) => {
    const blocked = api.toggleCoating(id);
    if (blocked) notify(blocked);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(960px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-base">Coatings &amp; treatments</DialogTitle>
          <DialogDescription className="text-xs">
            Combine freely — incompatible pairs grey out with the reason. {selected.size} selected.
          </DialogDescription>
          <div className="relative pt-2">
            <Search className="absolute left-3 top-[1.15rem] h-3.5 w-3.5 text-muted-foreground" />
            <Input className={cn(CONTROL, "pl-9")} aria-label="Search treatments" placeholder="Search treatments…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav aria-label="Treatment categories" className="flex shrink-0 gap-1 overflow-x-auto border-b p-3 sm:w-52 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r">
            {[{ name: "all", total: catalog.treatments.length, chosen: selected.size }, ...categories].map((c) => (
              <button
                key={c.name} type="button" onClick={() => setCategory(c.name)} aria-pressed={category === c.name}
                className={cn(
                  "flex shrink-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors",
                  category === c.name ? "bg-primary/10 font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <span className="truncate">{c.name === "all" ? "All treatments" : c.name}</span>
                <span className="flex items-center gap-1">
                  {c.chosen > 0 && <Badge className="h-4 min-w-4 justify-center px-1 text-[10px]">{c.chosen}</Badge>}
                  <span className="text-[10px] text-muted-foreground">{c.total}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
            {groups.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">No treatments match “{query}”.</p>}
            {groups.map((g) => (
              <section key={g} aria-label={g} className="space-y-2">
                {category === "all" && <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</h3>}
                <div className="grid gap-2 md:grid-cols-2">
                  {visible.filter((t) => t.c === g).map((t) => (
                    <TreatmentOption
                      key={t.id} t={t} selected={selected.has(t.id)} showPrice={catalog.pricesVisible}
                      why={selected.has(t.id) ? null : clashOf(t.id, api.values.treatments, catalog, sideColours)}
                      onToggle={() => toggle(t.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-5 py-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5" aria-label="Selected treatments">
            {chosen.length === 0 ? <span className="text-xs text-muted-foreground">Nothing selected — that is a valid choice.</span> : chosen.map((t) => (
              <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
                {t.n}
                <button type="button" aria-label={`Remove ${t.n}`} onClick={() => api.removeCoating(t.id)}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
          {catalog.pricesVisible && chosen.length > 0 && <span className="text-xs tabular-nums text-muted-foreground">+{money(chosenTotal)} per pair</span>}
          <Button type="button" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
