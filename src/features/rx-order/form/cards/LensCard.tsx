// Card 3: vision type, eyes, and the material / design / colour pickers.
// The pickers show what the account can order given the OTHER choices already
// made (each list narrows the others); they never look at the prescription or
// the frame — that guidance is advice, not a limit.
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BLANK_SIZES } from "../model";
import { SectionSummary } from "../Summary";
import type { Triple } from "../../domain/catalog";
import { Callout, Field, Seg, StepCard, CONTROL } from "../ui";
import type { CatalogItem } from "../types";
import { ComboBox } from "./ComboBox";
import type { CardProps } from "./types";

function LensSide({
  side, triple, options, catalog, api, notify, title,
}: {
  side: "od" | "os";
  triple: Triple;
  options: { mats: string[]; designs: string[]; cols: string[] };
  catalog: CardProps["catalog"];
  api: CardProps["api"];
  notify: CardProps["notify"];
  title?: string;
}) {
  const pick = (axis: keyof Triple) => (id: string) => {
    const note = api.pickLens(side, axis, id);
    if (note) notify(note);
  };
  const items = (all: CatalogItem[], ids: string[]) => all.filter((x) => ids.includes(x.id));
  return (
    <div className="space-y-2">
      {title && (
        <p className="flex items-center gap-2 text-xs font-semibold">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", side === "od" ? "bg-sky-100 text-sky-900" : "bg-violet-100 text-violet-900")}>{side.toUpperCase()}</span>
          {title}
          {side === "os" && (
            <Button type="button" variant="ghost" size="sm" className="ml-auto h-6 text-[11px]" onClick={() => { api.copyLensToOs(); notify("Left lens matched to the right"); }}>
              ⧉ Same as right
            </Button>
          )}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <ComboBox num={1} label="Material / index" value={triple.m} items={items(catalog.materials, options.mats)} onPick={pick("m")} />
        <ComboBox num={2} label="Lens design / type" value={triple.d} items={items(catalog.designs, options.designs)} onPick={pick("d")} />
        <ComboBox num={3} label="Lens colour option" value={triple.c} items={items(catalog.colours, options.cols)} onPick={pick("c")} />
      </div>
    </div>
  );
}

export function LensCard({ api, catalog, step, notify }: CardProps) {
  const { values, derived } = api;
  const split = values.lens.split && values.job.eyes === "pair";
  const names = derived.lens.names;
  const needsAdvanced = derived.lens.isProg;
  return (
    <StepCard
      id="sec-lens" index={3} title="Lens selection" sub="Only combinations that exist on your pricelist are offered."
      done={derived.sections.lens} folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("lens")}
      summary={<SectionSummary id="lens" values={values} derived={derived} catalog={catalog} />}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Vision type <span className="text-destructive">*</span></p>
          <Seg
            label="Vision type" value={values.job.vision}
            onChange={(v) => { const note = api.setJob("vision", v); if (note) notify(note); }}
            options={[{ value: "sv", label: "Single vision" }, { value: "mf", label: "Multifocal / Progressive" }]}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Eyes to supply <span className="text-destructive">*</span></p>
          <Seg
            label="Eyes to supply" value={values.job.eyes} onChange={(v) => api.setJob("eyes", v)}
            options={[{ value: "pair", label: "Pair" }, { value: "od", label: "Right only" }, { value: "os", label: "Left only" }]}
          />
          {values.job.eyes === "pair" && (
            <label className="mt-2 flex cursor-pointer items-start gap-2 text-xs">
              <Checkbox
                checked={values.lens.split} aria-label="Different lens for each eye"
                onCheckedChange={(c) => {
                  api.setSplit(c === true);
                  notify(c === true ? "Split eyes on — the left lens is quoted separately" : "Split eyes off — one lens for both eyes");
                }}
              />
              <span><b className="font-medium">Different lens for each eye</b><span className="block text-muted-foreground">Each side quoted separately</span></span>
            </label>
          )}
        </div>
        {values.job.vision === "sv" && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">Rx purpose <span className="text-destructive">*</span> <span className="font-normal text-muted-foreground">drives PD fields</span></p>
            <Seg
              label="Rx purpose" value={values.job.purpose} onChange={(v) => api.setJob("purpose", v)}
              options={[{ value: "dist", label: "Distance" }, { value: "read", label: "Reading" }, { value: "inter", label: "Intermediate" }]}
            />
            <p className="text-[11px] text-muted-foreground">
              {{ dist: "Distance Rx — distance PD only.", read: "Reading Rx — near PD collected instead of fitting height.", inter: "Intermediate Rx — near PD collected; note the working distance below." }[values.job.purpose]}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold">Choose in any order — each list narrows the others · type to search</p>
        <LensSide
          side="od" triple={values.lens.od} options={derived.lens.options[0]} catalog={catalog} api={api} notify={notify}
          title={split ? "Right eye" : undefined}
        />
        {split && derived.lens.options[1] && (
          <LensSide side="os" triple={values.lens.os} options={derived.lens.options[1]} catalog={catalog} api={api} notify={notify} title="Left eye" />
        )}
        {derived.lens.duplicate && (
          <Callout tone="warn">Both eyes have the same lens — turn off “Different lens for each eye”, or change one side.</Callout>
        )}
        <Callout>
          {names.some(Boolean)
            ? names.map((n, i) => <div key={i}>{split ? `${i === 0 ? "OD" : "OS"}: ` : ""}{n ?? "Pick a material, design and colour to name the lens."}</div>)
            : "Pick a material, design and colour to name the lens."}
        </Callout>
      </div>

      <details className="rounded-lg border bg-muted/20 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold">
          Advanced — blank diameter, corridor and base curve
          <span className="ml-2 font-normal text-muted-foreground">
            {derived.diameter.effective} mm blank{needsAdvanced ? ` · ${values.lens.corridor} mm corridor` : ""}
          </span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field
            label="Blank diameter"
            hint={derived.diameter.suggested
              ? `Min blank ≈ ED ${derived.frame.ed?.toFixed(1)} + 2 × decentration + 2 mm = ${derived.diameter.suggested} mm → ${derived.diameter.pick} mm blank`
              : "Enter A, DBL, ED and a PD for a suggestion."}
          >
            <Select value={values.lens.diameter} onValueChange={(v) => api.set("lens.diameter", v)}>
              <SelectTrigger className={CONTROL} aria-label="Blank diameter"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{derived.diameter.pick ? `Auto — ${derived.diameter.pick} mm suggested` : "Auto — lab decides"}</SelectItem>
                {BLANK_SIZES.map((s) => <SelectItem key={s} value={String(s)}>{s} mm{s >= 75 ? " — oversize" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          {derived.lens.isProg && (
            <Field label="Corridor length">
              <Select value={values.lens.corridor} onValueChange={(v) => api.set("lens.corridor", v)}>
                <SelectTrigger className={CONTROL} aria-label="Corridor length"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="11">11 mm — short</SelectItem>
                  <SelectItem value="13">13 mm — standard</SelectItem>
                  <SelectItem value="15">15 mm — long</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Base curve">
            <Select value={values.lens.baseCurve} onValueChange={(v) => api.set("lens.baseCurve", v)}>
              <SelectTrigger className={CONTROL} aria-label="Base curve"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Lab's choice (recommended)</SelectItem>
                {["2.00", "4.00", "6.00", "8.00"].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Leave these alone unless you have a reason — the lab picks sensibly from the Rx and the frame.</p>
      </details>
    </StepCard>
  );
}
