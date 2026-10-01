// Cards 5 and 6: coatings & treatments, and delivery & notes.
// Coatings: popular choices first, every treatment in a drawer, clashes explained
// where they happen. An empty selection is a valid answer — there is no "Done"
// click to make.
import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { clashOf } from "../model";
import { SectionSummary } from "../Summary";
import { EXPORT_DELIVERY } from "../types";
import { Callout, Field, StepCard, CONTROL } from "../ui";
import { TreatmentOption, TreatmentsDialog } from "./TreatmentsDialog";
import type { CardProps } from "./types";

const TINT_COLOURS = ["Grey", "Brown", "Green", "Blue", "Rose", "Amber", "Custom — see notes"];

export function CoatingsCard({ api, catalog, step, notify }: CardProps) {
  const { values, derived } = api;
  const [modal, setModal] = useState(false);
  const selected = new Set(values.treatments);
  const popular = catalog.treatments.filter((t) => t.pop);
  const sideColours = derived.lens.sides.map((s) => catalog.colours.find((c) => c.id === s.c)?.n ?? "");

  const toggle = (id: string) => {
    const blocked = api.toggleCoating(id);
    if (blocked) notify(blocked);
  };

  const tint = derived.treat.tintId ? catalog.treatments.find((t) => t.id === derived.treat.tintId) : null;
  const gradient = tint ? /grad/i.test(tint.n) : false;

  return (
    <StepCard
      id="sec-treat" index={5} title="Coatings & treatments" sub="Combine freely — incompatible pairs grey out with the reason."
      done={derived.sections.treat}
      folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("treat")}
      summary={<SectionSummary id="treat" values={values} derived={derived} catalog={catalog} />}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold">Popular choices</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {popular.map((t) => (
            <TreatmentOption
              key={t.id} t={t} selected={selected.has(t.id)} showPrice={catalog.pricesVisible}
              why={selected.has(t.id) ? null : clashOf(t.id, values.treatments, catalog, sideColours)}
              onToggle={() => toggle(t.id)}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={() => setModal(true)}>⊞ Browse all treatments</Button>
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
                <SelectTrigger className={CONTROL} aria-label="Tint colour"><SelectValue /></SelectTrigger>
                <SelectContent>{TINT_COLOURS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {gradient ? (
              <>
                <Field label="Density at top (%)"><Input className={CONTROL} inputMode="numeric" aria-label="Tint density at top" value={values.tint.gradTop} onChange={(e) => api.setTint({ gradTop: e.target.value })} /></Field>
                <Field label="Density at bottom (%)"><Input className={CONTROL} inputMode="numeric" aria-label="Tint density at bottom" value={values.tint.gradBottom} onChange={(e) => api.setTint({ gradBottom: e.target.value })} /></Field>
              </>
            ) : (
              <>
                <Field label="Density (% — max 85)"><Input className={CONTROL} inputMode="numeric" aria-label="Tint density" value={values.tint.density} onChange={(e) => api.setTint({ density: e.target.value })} /></Field>
                <Field label="Finish">
                  <Select value={values.tint.finish} onValueChange={(v) => api.setTint({ finish: v })}>
                    <SelectTrigger className={CONTROL} aria-label="Tint finish"><SelectValue /></SelectTrigger>
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

      <TreatmentsDialog open={modal} onOpenChange={setModal} catalog={catalog} api={api} sideColours={sideColours} notify={notify} />
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
      summary={<SectionSummary id="notes" values={values} derived={derived} catalog={catalog} />}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Service level">
          <Select value={values.delivery.service} onValueChange={(v) => api.setDelivery({ service: v })}>
            <SelectTrigger className={CONTROL} aria-label="Service level"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className={CONTROL} aria-label="Delivery"><SelectValue /></SelectTrigger>
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
