// Cards 5 and 6: coatings & treatments, and delivery & notes.
// Coatings: popular choices first, every treatment in a drawer, clashes explained
// where they happen. An empty selection is a valid answer — there is no "Done"
// click to make.
import { useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { clashOf, sectionSummary } from "../model";
import { EXPORT_DELIVERY } from "../types";
import type { CatalogTreatment } from "../types";
import { Callout, Field, StepCard } from "../ui";
import type { CardProps } from "./types";

const TINT_COLOURS = ["Grey", "Brown", "Green", "Blue", "Rose", "Amber", "Custom — see notes"];
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CoatingsCard({ api, catalog, step, notify }: CardProps) {
  const { values, derived } = api;
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState("");
  const selected = new Set(values.treatments);
  const popular = catalog.treatments.filter((t) => t.pop);
  const sideColours = derived.lens.sides.map((s) => catalog.colours.find((c) => c.id === s.c)?.n ?? "");
  const show = catalog.pricesVisible;

  const toggle = (id: string) => {
    const blocked = api.toggleCoating(id);
    if (blocked) notify(blocked);
  };

  const Option = ({ t }: { t: CatalogTreatment }) => {
    const on = selected.has(t.id);
    const why = on ? null : clashOf(t.id, values.treatments, catalog, sideColours);
    const blocked = !!why && !why.startsWith("Replaces");
    return (
      <button
        type="button" onClick={() => toggle(t.id)} aria-pressed={on} disabled={blocked} title={why ?? undefined}
        data-tid={t.id}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg border p-3 text-left text-xs transition-colors",
          on ? "border-primary bg-primary/5" : "hover:bg-muted/50",
          blocked && "cursor-not-allowed opacity-50",
        )}
      >
        <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border", on && "border-primary bg-primary text-primary-foreground")}>
          {on && <Check className="h-3 w-3" />}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block font-medium">{t.n}</b>
          {t.d && <span className="block text-muted-foreground">{t.d}</span>}
          {why && <span className="block text-[11px] text-amber-700 dark:text-amber-300">{why}</span>}
        </span>
        <span className="shrink-0 text-muted-foreground">{show ? (t.unpriced ? "on request" : `+${money(t.p)}`) : ""}</span>
      </button>
    );
  };

  const filtered = catalog.treatments.filter((t) => `${t.n} ${t.c} ${t.d}`.toLowerCase().includes(query.trim().toLowerCase()));
  const groups = [...new Set(filtered.map((t) => t.c))];
  const tint = derived.treat.tintId ? catalog.treatments.find((t) => t.id === derived.treat.tintId) : null;
  const gradient = tint ? /grad/i.test(tint.n) : false;

  return (
    <StepCard
      id="sec-treat" index={5} title="Coatings & treatments" sub="Combine freely — incompatible pairs grey out with the reason."
      done={derived.sections.treat}
      folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("treat")}
      summary={sectionSummary("treat", values, derived, catalog)}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold">Popular choices</p>
        <div className="grid gap-2 sm:grid-cols-2">{popular.map((t) => <Option key={t.id} t={t} />)}</div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDrawer(true)}>⊞ Browse all treatments</Button>
          <span className="text-[11px] text-muted-foreground">Prices appear in the live quote as you select.</span>
        </div>
        {values.treatments.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Selected coatings">
            {values.treatments.map((id) => {
              const t = catalog.treatments.find((x) => x.id === id);
              return (
                <Badge key={id} variant="secondary" className="gap-1 pr-1">
                  {t?.n ?? "Unavailable coating"}
                  <button type="button" aria-label={`Remove ${t?.n ?? "coating"}`} onClick={() => api.removeCoating(id)}><X className="h-3 w-3" /></button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {derived.treat.issues.map((i) => (
        <Callout key={`${i.id}-${i.kind}`} tone="danger" action={<Button type="button" size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => api.removeCoating(i.id)}>Remove</Button>}>
          {i.text}
        </Callout>
      ))}

      {tint && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="text-xs font-semibold">{tint.n} — configuration</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Colour">
              <Select value={values.tint.colour} onValueChange={(v) => api.setTint({ colour: v })}>
                <SelectTrigger aria-label="Tint colour"><SelectValue /></SelectTrigger>
                <SelectContent>{TINT_COLOURS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {gradient ? (
              <>
                <Field label="Density at top (%)"><Input inputMode="numeric" aria-label="Tint density at top" value={values.tint.gradTop} onChange={(e) => api.setTint({ gradTop: e.target.value })} /></Field>
                <Field label="Density at bottom (%)"><Input inputMode="numeric" aria-label="Tint density at bottom" value={values.tint.gradBottom} onChange={(e) => api.setTint({ gradBottom: e.target.value })} /></Field>
              </>
            ) : (
              <>
                <Field label="Density (% — max 85)"><Input inputMode="numeric" aria-label="Tint density" value={values.tint.density} onChange={(e) => api.setTint({ density: e.target.value })} /></Field>
                <Field label="Finish">
                  <Select value={values.tint.finish} onValueChange={(v) => api.setTint({ finish: v })}>
                    <SelectTrigger aria-label="Tint finish"><SelectValue /></SelectTrigger>
                    <SelectContent>{["Standard", "UV-stable", "Fade-resistant"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox checked={values.tint.match} onCheckedChange={(c) => api.setTint({ match: c === true })} aria-label="Match to a sample lens" />
            Match to a sample lens I'm sending in <Badge variant="outline" className="text-[10px]">owner review</Badge>
          </label>
        </div>
      )}

      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent className="flex w-full flex-col gap-3 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>All treatments</SheetTitle>
            <SheetDescription>{selected.size} selected</SheetDescription>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input className="pl-8" aria-label="Search treatments" placeholder="Search treatments…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {groups.length === 0 && <p className="text-xs text-muted-foreground">No treatments match.</p>}
            {groups.map((g) => (
              <div key={g} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g}</p>
                {filtered.filter((t) => t.c === g).map((t) => <Option key={t.id} t={t} />)}
              </div>
            ))}
          </div>
          <Button type="button" onClick={() => setDrawer(false)}>Done</Button>
        </SheetContent>
      </Sheet>
    </StepCard>
  );
}

const DELIVERY_METHODS = ["Weekly courier run", "Collect from lab", "Ship — overnight", EXPORT_DELIVERY];

export function DeliveryCard({ api, catalog, step }: CardProps) {
  const { values, derived } = api;
  return (
    <StepCard
      id="sec-notes" index={6} title="Delivery & notes" sub="Anything the lab should know before it starts."
      done={derived.sections.notes} folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("notes")}
      summary={sectionSummary("notes", values, derived, catalog)}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Service level">
          <Select value={values.delivery.service} onValueChange={(v) => api.setDelivery({ service: v })}>
            <SelectTrigger aria-label="Service level"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="std">Standard — {derived.treat.serviceLead}</SelectItem>
              <SelectItem value="pri">Priority — 3 working days (+15%)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Delivery"
          hint={!values.delivery.methodTouched && values.delivery.method === EXPORT_DELIVERY ? "This account ships outside Barbados, so export is the default." : undefined}
        >
          <Select value={values.delivery.method} onValueChange={(v) => api.setDelivery({ method: v, methodTouched: true })}>
            <SelectTrigger aria-label="Delivery"><SelectValue /></SelectTrigger>
            <SelectContent>{DELIVERY_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Notes to the lab" htmlFor="rx-notes">
        <Textarea
          id="rx-notes" rows={3} placeholder="e.g. Patient is a previous progressive wearer — match old fitting height."
          value={values.delivery.notes} onChange={(e) => api.setDelivery({ notes: e.target.value })}
        />
      </Field>
    </StepCard>
  );
}
