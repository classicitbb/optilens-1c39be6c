// Card 4: the prescription. Keyboard-first — Tab moves across a row and Enter
// normalises the cell and drops to the next one. What a person typed is only
// tidied (signed, stepped to a quarter, minus cylinder…) when they leave the
// cell; errors show beside the field, not in a popup.
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RxField } from "../../domain/normalise";
import { SectionSummary } from "../Summary";
import type { RxEyeText } from "../types";
import { Callout, StepCard } from "../ui";
import type { CardProps } from "./types";

type Cell = Exclude<keyof RxEyeText, "base">;

const PLACEHOLDER: Record<Cell, { od: string; os: string }> = {
  sph: { od: "+0.00", os: "+0.00" },
  cyl: { od: "-0.00", os: "-0.00" },
  axis: { od: "—", os: "—" },
  add: { od: "+0.00", os: "+0.00" },
  pd: { od: "32.0", os: "31.5" },
  npd: { od: "30.0", os: "29.5" },
  ht: { od: "22.0", os: "22.0" },
  prism: { od: "0.00", os: "0.00" },
};

export function RxCard({ api, catalog, step, notify }: CardProps) {
  const { values, derived } = api;
  const tableRef = useRef<HTMLTableElement>(null);
  const { rules } = derived;
  const heightLabel = values.job.vision !== "mf" ? "OC Ht" : rules.isProg ? "Fitting Ht" : "Segment Ht";

  const cols: { key: Cell; label: string; mode: "decimal" | "numeric"; show: boolean }[] = [
    { key: "sph", label: "Sphere", mode: "decimal", show: true },
    { key: "cyl", label: "Cylinder", mode: "decimal", show: true },
    { key: "axis", label: "Axis", mode: "numeric", show: true },
    { key: "add", label: "Add", mode: "decimal", show: rules.needsAdd },
    { key: "pd", label: "Dist PD", mode: "decimal", show: true },
    { key: "npd", label: "Near PD", mode: "decimal", show: rules.needsNearPD },
    { key: "ht", label: heightLabel, mode: "decimal", show: true },
    { key: "prism", label: "Prism", mode: "decimal", show: true },
  ];

  const errorFor = (eye: "od" | "os", field: RxField | "base") => derived.rx.errors.find((e) => e.eye === eye && e.field === field);

  const blur = (eye: "od" | "os", field: Cell) => {
    const note = api.blurRx(eye, field);
    if (note) notify(note);
  };

  const onEnter = (e: React.KeyboardEvent<HTMLElement>, eye: "od" | "os", field: Cell) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    blur(eye, field);
    const cells = Array.from(tableRef.current?.querySelectorAll<HTMLElement>("[data-rx-cell]:not([disabled])") ?? []);
    const next = cells[cells.indexOf(e.currentTarget) + 1];
    next?.focus();
  };

  return (
    <StepCard
      id="sec-rx" index={4} title="Prescription"
      sub="Type it any way — we normalise to minus cyl, 0.25 steps, signed."
      done={derived.sections.rx} folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("rx")}
      summary={<SectionSummary id="rx" values={values} derived={derived} catalog={catalog} />}
    >
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full min-w-[640px] border-separate border-spacing-x-1.5 border-spacing-y-1 text-xs" aria-label="Prescription">
          <thead>
            <tr className="text-left text-[11px] font-semibold text-muted-foreground">
              <th className="w-12" />
              {cols.filter((c) => c.show).map((c) => <th key={c.key} scope="col" className="font-semibold">{c.label}</th>)}
              <th scope="col" className="font-semibold">Base</th>
            </tr>
          </thead>
          <tbody>
            {(["od", "os"] as const).map((eye) => {
              const on = derived.eyes.includes(eye);
              return (
                <tr key={eye} className={cn(!on && "opacity-40")} data-eye={eye}>
                  <th scope="row" className="text-left">
                    <span className="block text-sm font-bold leading-none">{eye.toUpperCase()}</span>
                    <span className="text-[10px] font-normal text-muted-foreground">{eye === "od" ? "RIGHT" : "LEFT"}</span>
                  </th>
                  {cols.filter((c) => c.show).map((c) => {
                    const err = errorFor(eye, c.key);
                    return (
                      <td key={c.key}>
                        <Input
                          data-rx-cell data-f={c.key}
                          aria-label={`${eye.toUpperCase()} ${c.label}`}
                          aria-invalid={!!err}
                          title={err?.text}
                          disabled={!on}
                          inputMode={c.mode}
                          placeholder={PLACEHOLDER[c.key][eye]}
                          className={cn("h-8 px-2 text-xs", err && "border-destructive ring-1 ring-destructive/30")}
                          value={values.rx[eye][c.key]}
                          onChange={(ev) => api.setRxText(eye, c.key, ev.target.value)}
                          onBlur={() => blur(eye, c.key)}
                          onKeyDown={(ev) => onEnter(ev, eye, c.key)}
                        />
                      </td>
                    );
                  })}
                  <td>
                    <select
                      data-rx-cell aria-label={`${eye.toUpperCase()} prism base`} disabled={!on}
                      className={cn("h-8 w-full rounded-md border bg-background px-1 text-xs", errorFor(eye, "base") && "border-destructive")}
                      value={values.rx[eye].base}
                      onChange={(ev) => api.setRxText(eye, "base", ev.target.value)}
                    >
                      <option value="">—</option>
                      {["IN", "OUT", "UP", "DOWN"].map((b) => <option key={b}>{b}</option>)}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        {values.job.eyes === "pair" && (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { api.copyOdToOs(); notify("Right eye copied to left"); }}>
            ⇊ Copy OD to OS
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={api.clearRx}>✕ Clear Rx</Button>
      </div>

      {derived.rx.prompts.map((p) => (
        <Callout
          key={p.eye}
          action={(
            <div className="flex gap-1">
              <Button type="button" size="sm" className="h-6 text-[11px]" onClick={() => tableRef.current?.querySelector<HTMLElement>(`tr[data-eye="${p.eye}"] [data-f="cyl"]`)?.focus()}>Add cylinder</Button>
              <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => api.setRxText(p.eye, "axis", "")}>Remove axis</Button>
            </div>
          )}
        >
          ❓ {p.text}
        </Callout>
      ))}
      {derived.rx.errors.length > 0 && (
        <Callout tone="warn">{derived.rx.errors.map((e) => <div key={e.text}>{e.text}</div>)}</Callout>
      )}
      {derived.rx.warnings.map((w) => (
        <Callout key={w.id} onDismiss={() => api.dismissWarning(w.id)}>{w.text}</Callout>
      ))}

      <label className="flex cursor-pointer items-start gap-2 text-xs">
        <Checkbox checked={values.plusCyl.on} onCheckedChange={(c) => api.togglePlusCyl(c === true)} aria-label="Prescription is written in plus cylinder" />
        <span>If your prescription is written in plus cylinder — enter it as prescribed, we'll convert to minus cyl above</span>
      </label>
      {values.plusCyl.on && (
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-xs font-semibold">As prescribed <span className="font-normal text-muted-foreground">plus cylinder — converts to the minus-cyl table above</span></p>
          <div className="grid max-w-md grid-cols-[3rem_1fr_1fr_1fr] items-center gap-2 text-xs">
            <span />
            <span className="font-semibold text-muted-foreground">Sphere</span>
            <span className="font-semibold text-muted-foreground">Cylinder</span>
            <span className="font-semibold text-muted-foreground">Axis</span>
            {(["od", "os"] as const).map((eye) => (
              <div key={eye} className="contents">
                <b>{eye.toUpperCase()}</b>
                {(["sph", "cyl", "axis"] as const).map((f) => (
                  <Input
                    key={f} className="h-8 px-2 text-xs" aria-label={`${eye.toUpperCase()} ${f} as prescribed`}
                    inputMode={f === "axis" ? "numeric" : "decimal"} placeholder={f === "axis" ? "—" : "+0.00"}
                    value={values.plusCyl[eye][f]}
                    onChange={(ev) => api.setPlusText(eye, f, ev.target.value)}
                    onBlur={() => api.blurPlus(eye, f)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </StepCard>
  );
}
