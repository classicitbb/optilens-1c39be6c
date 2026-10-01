// Chemistrie magnetic layer: up to three clip-on lenses, each configured here and
// sent to the lab as instructions (never priced, never a quote line).
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  CHEM_BLUE_POWERS, CHEM_BRIDGES, CHEM_COLOURS, CHEM_CRYSTALS, CHEM_GRADIENTS, CHEM_MAGNETS, CHEM_MAX_CLIPS, CHEM_MIRRORS,
  CHEM_READER_POWERS, CHEM_TYPES, clipComplete, duplicateClipIds, type ChemClip, type ChemSwatch,
} from "../../domain/chemistrie";
import { CONTROL, Callout, Field } from "../ui";
import type { CardProps } from "./types";

const NONE = "__none";

function Dot({ hex }: { hex: string }) {
  return <span className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/20" style={{ background: hex }} aria-hidden="true" />;
}

/** A dropdown whose options carry their colour. */
function SwatchSelect({
  label, required, value, items, placeholder, disabled, onChange, hint,
}: {
  label: string;
  required?: boolean;
  value: string;
  items: readonly ChemSwatch[];
  placeholder: string;
  disabled?: boolean;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const current = items.find((i) => i.id === value);
  return (
    <Field label={label} required={required} hint={hint}>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)} disabled={disabled}>
        <SelectTrigger className={cn(CONTROL, "gap-2")} aria-label={label}>
          <span className="flex min-w-0 items-center gap-2">
            {current && <Dot hex={current.hex} />}
            <SelectValue placeholder={placeholder} />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{placeholder}</SelectItem>
          {items.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              <span className="flex items-center gap-2"><Dot hex={i.hex} />{i.n}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function ClipCard({
  clip, index, total, dupes, api,
}: { clip: ChemClip; index: number; total: number; dupes: Set<string>; api: CardProps["api"] }) {
  const t = CHEM_TYPES.find((x) => x.id === clip.type) ?? CHEM_TYPES[0];
  const set = api.setChemField;
  const duplicate = dupes.has(clip.id);
  const complete = clipComplete(clip);
  const powers = clip.type === "blue" ? CHEM_BLUE_POWERS : CHEM_READER_POWERS;
  return (
    <div className={cn("space-y-3 rounded-lg border p-3", duplicate ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20" : "bg-muted/20")} aria-label={`Chemistrie clip ${index + 1}`}>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span>Clip {index + 1} of {total} · layer type</span>
        {total > 1 && (
          <button type="button" aria-label={`Remove clip ${index + 1}`} title="Remove this clip" onClick={() => api.removeChemClip(clip.id)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Layer type">
        {CHEM_TYPES.map((x) => (
          <button
            key={x.id} type="button" aria-pressed={clip.type === x.id} onClick={() => api.setChemType(clip.id, x.id)}
            className={cn("rounded-lg border bg-card p-2.5 text-left text-xs transition-colors", clip.type === x.id ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/50")}
          >
            <b className="block text-[13px] font-medium">{x.n}</b>
            <span className="text-muted-foreground">{x.d}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {t.id === "sun" && (
          <>
            <SwatchSelect label="Solid polarised" required value={clip.colour} items={CHEM_COLOURS} placeholder="Select a colour"
              disabled={!!clip.mirror || !!clip.gradient} onChange={(v) => set(clip.id, "colour", v)} />
            <SwatchSelect label="Mirror polarised" required value={clip.mirror} items={CHEM_MIRRORS} placeholder="Select a mirror finish"
              disabled={!!clip.colour || !!clip.gradient} onChange={(v) => set(clip.id, "mirror", v)} />
            <SwatchSelect label="Gradient sunlens" required value={clip.gradient} items={CHEM_GRADIENTS} placeholder="Select a gradient"
              disabled={!!clip.colour || !!clip.mirror} onChange={(v) => set(clip.id, "gradient", v)} />
          </>
        )}
        {(t.id === "readers" || t.id === "blue") && (
          <Field label={t.id === "blue" ? "Blue light power" : "Reader power"} required>
            <Select value={clip.add || NONE} onValueChange={(v) => set(clip.id, "add", v === NONE ? "" : v)}>
              <SelectTrigger className={CONTROL} aria-label={t.id === "blue" ? "Blue light power" : "Reader power"}><SelectValue placeholder="Choose power…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Choose power…</SelectItem>
                {powers.map((p) => <SelectItem key={p} value={p}>{p === "0.00" ? "Plano" : `+${p}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        )}
        {t.id === "drive" && <p className="text-[11px] text-muted-foreground sm:col-span-3">Night Drive is supplied in its fixed, non-polarised rose tint.</p>}
      </div>
      {t.id === "sun" && <p className="-mt-1 text-[11px] text-muted-foreground">Choose one of solid, mirror or gradient — picking one greys out the others.</p>}

      <p className="text-xs font-semibold">Clip hardware</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <SwatchSelect label="Magnet colour" value={clip.magnet} items={CHEM_MAGNETS} placeholder="Select a magnet colour" onChange={(v) => set(clip.id, "magnet", v)} />
        <SwatchSelect label="Bridge colour" value={clip.bridge} items={CHEM_BRIDGES} placeholder="Select a bridge colour" onChange={(v) => set(clip.id, "bridge", v)} />
        <SwatchSelect label="Crystal colour" value={clip.crystal === "none" ? "" : clip.crystal} items={CHEM_CRYSTALS} placeholder="None"
          hint="optional accent" onChange={(v) => set(clip.id, "crystal", v || "none")} />
      </div>

      {duplicate && <p className="text-[11px] text-amber-800 dark:text-amber-200">⚠ Identical to another clip on this order — change an option here or remove one.</p>}
      {!complete && <p className="text-[11px] text-destructive" role="alert">Complete this clip before leaving the section.</p>}
      <p className="text-[11px] text-muted-foreground">Cut to the same shape as the main order — the frame trace or standard shape above is reused, so it clips flush.</p>
    </div>
  );
}

export function ChemistrieBlock({ api }: Pick<CardProps, "api">) {
  const clips = api.values.chemClips;
  const on = clips.length > 0;
  const dupes = duplicateClipIds(clips);
  return (
    <div className="space-y-3 rounded-lg border p-3" aria-label="Chemistrie magnetic layer">
      <div>
        <p className="text-xs font-semibold">
          Chemistrie magnetic layer{" "}
          <span className="font-normal text-muted-foreground">clip-on second lens, held magnetically · up to {CHEM_MAX_CLIPS} clips per order</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">Saved as lab instructions. Chemistrie availability and price are confirmed separately and are not included in this quote.</p>
      </div>
      <label className="flex max-w-md cursor-pointer items-start gap-2 rounded-lg border p-3 text-xs hover:bg-muted/40">
        <Checkbox checked={on} onCheckedChange={(c) => api.toggleChemistrie(c === true)} aria-label="Add a Chemistrie layer" />
        <span><b className="block font-medium">Add a Chemistrie layer</b><span className="text-muted-foreground">Custom-cut magnetic overlay made to this same frame shape</span></span>
      </label>
      {on && (
        <div className="space-y-3">
          {clips.map((c, i) => <ClipCard key={c.id} clip={c} index={i} total={clips.length} dupes={dupes} api={api} />)}
          <div className="flex flex-wrap items-center gap-3">
            {clips.length < CHEM_MAX_CLIPS ? (
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1 text-xs" onClick={() => api.addChemClip()}><Plus className="h-3.5 w-3.5" /> Add another clip</Button>
            ) : <span className="text-[11px] text-muted-foreground">Maximum of {CHEM_MAX_CLIPS} clips per order.</span>}
            <span className="text-[11px] text-muted-foreground">{clips.length} / {CHEM_MAX_CLIPS} clips</span>
          </div>
        </div>
      )}
      {api.derived.treat.chemIssues.length > 0 && on && (
        <Callout tone="danger">{api.derived.treat.chemIssues.map((i) => <div key={i}>{i}</div>)}</Callout>
      )}
    </div>
  );
}
