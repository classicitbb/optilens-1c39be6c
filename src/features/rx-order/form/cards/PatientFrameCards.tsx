// Cards 1 and 2: who the job is for, and the frame it has to fit.
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Callout, Field, Seg, StepCard } from "../ui";
import { sectionSummary } from "../model";
import type { CardProps } from "./types";

const MOUNTS = [
  { value: "plastic", label: "Plastic" },
  { value: "metal", label: "Metal" },
  { value: "grooved", label: "Grooved / nylon" },
  { value: "rimless", label: "Rimless — drill mount" },
];

const SCOPE_NOTES = {
  uncut: "Uncut Rx lenses supplied to your lab — you edge and fit. We still need the frame details below so we can confirm the blank will cut out.",
  remote: "You trace the frame and send us the file; we cut, edge and finish to shape and ship glazing-ready lenses. The frame never leaves your practice.",
  glaze: "Send us the frame and we edge, mount and return it dispense-ready.",
} as const;

export function PatientCard({ api, catalog, step }: CardProps) {
  const { values, derived, form } = api;
  return (
    <StepCard
      id="sec-patient" index={1} title="Patient & order" sub="Who the job is for."
      done={derived.sections.patient} folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("patient")}
      summary={sectionSummary("patient", values, derived, catalog)}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Patient first name" required htmlFor="rx-pfirst">
          <Input id="rx-pfirst" placeholder="Marcus" autoComplete="off" {...form.register("patient.first")} />
        </Field>
        <Field label="Patient last name" required htmlFor="rx-plast">
          <Input id="rx-plast" placeholder="Grant" autoComplete="off" {...form.register("patient.last")} />
        </Field>
        <Field label="Your order reference" optional htmlFor="rx-ref" hint="Appears on your invoice if supplied.">
          <Input id="rx-ref" placeholder="e.g. JOB-2291" autoComplete="off" {...form.register("reference")} />
        </Field>
      </div>
    </StepCard>
  );
}

export function FrameCard({ api, catalog, step }: CardProps) {
  const { values, derived } = api;
  const f = values.frame;
  const edShown = f.edTouched ? f.ed : derived.frame.ed !== null ? derived.frame.ed.toFixed(1) : "";
  const issueFor = (field: "a" | "b" | "ed" | "dbl") => derived.frame.issues.find((i) => i.field === field)?.text ?? null;
  return (
    <StepCard
      id="sec-frame" index={2} title="Frame & measurements" sub="Job type and the frame the lenses have to fit."
      done={derived.sections.frame} folded={step.folded} onEdit={step.edit} onClear={() => api.clearSection("frame")}
      summary={sectionSummary("frame", values, derived, catalog)}
    >
      <div className="space-y-2">
        <p className="text-xs font-semibold">How should we supply this job? <span className="text-destructive">*</span></p>
        <Seg
          label="Job type" value={values.job.scope} onChange={(v) => api.setJob("scope", v)}
          options={[
            { value: "uncut", label: "Uncut Rx lenses" },
            { value: "remote", label: "Remote edge", disabled: true, hint: "Needs the frame-trace upload, which this form does not have yet" },
            { value: "glaze", label: "Full glaze" },
          ]}
        />
        <p className="text-xs text-muted-foreground">{SCOPE_NOTES[values.job.scope]}</p>
        <p className="text-[11px] text-muted-foreground">Remote edge (trace upload) is not on the new form yet — use the previous form for those orders.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Frame name / model" required htmlFor="rx-fname">
          <Input id="rx-fname" placeholder="e.g. Ray-Ban RB5154" autoComplete="off" value={f.name} onChange={(e) => api.setFrame("name", e.target.value)} />
        </Field>
        <Field label="Mount type" required>
          <Select value={f.mount || undefined} onValueChange={(v) => api.setFrame("mount", v)}>
            <SelectTrigger aria-label="Mount type"><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>{MOUNTS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Frame supplied by">
          <Select value={f.source} onValueChange={(v) => api.setFrame("source", v)}>
            <SelectTrigger aria-label="Frame supplied by"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Customer — shipping to lab">Customer — shipping to lab</SelectItem>
              <SelectItem value="Classic Visions stock frame">Classic Visions stock frame</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Field label="A" required htmlFor="rx-fa" error={issueFor("a")}>
          <Input id="rx-fa" inputMode="decimal" placeholder="52.0" value={f.a} onChange={(e) => api.setFrame("a", e.target.value)} />
        </Field>
        <Field label="B" required htmlFor="rx-fb" error={issueFor("b")}>
          <Input id="rx-fb" inputMode="decimal" placeholder="38.0" value={f.b} onChange={(e) => api.setFrame("b", e.target.value)} />
        </Field>
        <Field
          label="ED" required htmlFor="rx-fed" error={issueFor("ed")}
          hint={f.edTouched
            ? derived.frame.ed !== null ? "You've overridden the calculated value" : undefined
            : derived.frame.a !== null && derived.frame.b !== null ? `Estimated √(A²+B²) = ${edShown} mm — editable` : "Auto from A and B — editable"}
        >
          <Input id="rx-fed" inputMode="decimal" placeholder="—" value={edShown} onChange={(e) => api.setFrame("ed", e.target.value)} />
        </Field>
        <Field label="DBL" required htmlFor="rx-fdbl" error={issueFor("dbl")}>
          <Input id="rx-fdbl" inputMode="decimal" placeholder="18.0" value={f.dbl} onChange={(e) => api.setFrame("dbl", e.target.value)} />
        </Field>
      </div>
      {derived.frame.issues.length > 0 && (
        <Callout tone="warn">{derived.frame.issues.map((i) => <div key={i.text}>{i.text}</div>)}</Callout>
      )}
    </StepCard>
  );
}
