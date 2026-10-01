// What a folded card shows: labelled fields (and, for the prescription, a small
// table) instead of one run-on line. Presentation only — values come from the
// derived model.
import { clipParts } from "../domain/chemistrie";
import { STD_SHAPES } from "../domain/standardShapes";
import { cn } from "@/lib/utils";
import type { Derived, SectionId } from "./model";
import type { RxCatalog, RxFormValues } from "./types";

export const MOUNT_LABELS: Record<string, string> = {
  plastic: "Plastic", metal: "Metal", grooved: "Grooved / nylon", rimless: "Rimless — drill mount",
};
const SCOPE_LABELS = { uncut: "Uncut", remote: "Remote edge", glaze: "Full glaze" } as const;

type Field = { label: string; value: string };

function Fields({ fields, className }: { fields: Field[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-[repeat(auto-fit,minmax(110px,1fr))]", className)}>
      {fields.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="border-b border-emerald-700/25 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">{f.label}</dt>
          <dd className="pt-1 text-xs font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">{f.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

const sg = (n: number | null, dp = 2) => (n === null ? "—" : `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(dp)}`);
const mm = (n: number | null, dp = 1) => (n === null ? "—" : n.toFixed(dp));

function RxTable({ values, derived }: { values: RxFormValues; derived: Derived }) {
  const { rules } = derived;
  const heightLabel = values.job.vision !== "mf" ? "OC Ht" : rules.isProg ? "Fitting Ht" : "Segment Ht";
  const cols: { label: string; show: boolean; cell: (r: NonNullable<Derived["rows"]["od"]>) => string }[] = [
    { label: "Sphere", show: true, cell: (r) => sg(r.sph) },
    { label: "Cylinder", show: true, cell: (r) => sg(r.cyl) },
    { label: "Axis", show: true, cell: (r) => (r.axis === null ? "—" : String(r.axis)) },
    { label: "Add", show: rules.needsAdd, cell: (r) => sg(r.add) },
    { label: "Dist PD", show: true, cell: (r) => mm(r.pd) },
    { label: "Near PD", show: rules.needsNearPD, cell: (r) => mm(r.npd) },
    { label: heightLabel, show: true, cell: (r) => mm(r.ht) },
    { label: "Prism", show: true, cell: (r) => (r.prism ? r.prism.toFixed(2) : "—") },
    { label: "Base", show: true, cell: (r) => r.base || "—" },
  ];
  const shown = cols.filter((c) => c.show);
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[520px] border-collapse text-center text-xs">
        <thead>
          <tr className="bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left">Eye</th>
            {shown.map((c) => <th key={c.label} className="border-l px-3 py-2">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {derived.eyes.map((e) => (
            <tr key={e} className="border-t">
              <th scope="row" className="px-3 py-2 text-left">
                <b className="block text-sm leading-none">{e.toUpperCase()}</b>
                <span className="text-[10px] font-normal text-muted-foreground">{e === "od" ? "RIGHT" : "LEFT"}</span>
              </th>
              {shown.map((c) => <td key={c.label} className="border-l px-3 py-2 tabular-nums">{c.cell(derived.rows[e]!)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SectionSummary({
  id, values, derived, catalog,
}: { id: SectionId; values: RxFormValues; derived: Derived; catalog: RxCatalog }) {
  const box = "rounded-lg border border-emerald-600/25 bg-emerald-50/70 p-3 dark:bg-emerald-950/20";

  if (id === "rx") return <RxTable values={values} derived={derived} />;

  if (id === "patient") {
    return (
      <div className={box}>
        <Fields fields={[
          { label: "Patient", value: `${values.patient.first.trim()} ${values.patient.last.trim()}`.trim() },
          ...(values.reference.trim() ? [{ label: "Your reference", value: values.reference.trim() }] : []),
        ]} />
      </div>
    );
  }

  if (id === "frame") {
    const remote = values.job.scope === "remote";
    const shape = values.shape.source === "standard"
      ? STD_SHAPES.find((s) => s.id === values.shape.standardId)?.n ?? ""
      : values.shape.source === "trace" ? values.shape.fileName ?? "Uploaded trace" : "";
    return (
      <div className={box}>
        <Fields fields={[
          remote || shape ? { label: remote ? "Shape / trace" : "Shape", value: shape } : { label: "Supplied by", value: values.frame.source },
          { label: "Frame", value: values.frame.name.trim() },
          { label: "Mount", value: MOUNT_LABELS[values.frame.mount] ?? values.frame.mount },
          { label: "A", value: mm(derived.frame.a) },
          { label: "B", value: mm(derived.frame.b) },
          { label: "ED", value: derived.frame.ed === null ? "—" : String(+derived.frame.ed.toFixed(2)) },
          { label: "DBL", value: mm(derived.frame.dbl) },
          { label: "Job type", value: SCOPE_LABELS[values.job.scope] },
        ]} />
      </div>
    );
  }

  if (id === "lens") {
    const split = values.lens.split && values.job.eyes === "pair";
    const side = (t: typeof values.lens.od): Field[] => {
      const m = catalog.materials.find((x) => x.id === t.m);
      const d = catalog.designs.find((x) => x.id === t.d);
      const c = catalog.colours.find((x) => x.id === t.c);
      return [
        { label: "Material", value: m?.n ?? "" },
        { label: "Style", value: d?.v === "mf" ? (d.prog ? "Progressive" : "Bifocal") : "Single vision" },
        { label: "Design", value: d?.n ?? "" },
        { label: "Option", value: c?.n ?? "" },
      ];
    };
    const purpose = values.job.vision === "sv" ? { dist: "Distance", read: "Reading", inter: "Intermediate" }[values.job.purpose] : "";
    return (
      <div className={cn(box, "space-y-3")}>
        <Fields fields={[
          { label: "Vision type", value: values.job.vision === "mf" ? "Multifocal / Progressive" : "Single vision" },
          { label: "Eyes to supply", value: values.job.eyes === "pair" ? (split ? "Pair · different lens each eye" : "Pair") : values.job.eyes === "od" ? "Right only" : "Left only" },
          ...(purpose ? [{ label: "Rx purpose", value: purpose }] : []),
        ]} />
        {split ? (
          <>
            <Fields fields={[{ label: "Right eye", value: "OD" }, ...side(values.lens.od)]} />
            <Fields fields={[{ label: "Left eye", value: "OS" }, ...side(values.lens.os)]} />
          </>
        ) : <Fields fields={side(values.lens.od)} />}
      </div>
    );
  }

  if (id === "treat") {
    const names = values.treatments.map((tid) => catalog.treatments.find((t) => t.id === tid)?.n ?? "Unavailable coating");
    const tint = derived.treat.tintId;
    return (
      <div className={box}>
        <Fields fields={[
          { label: "Coatings & treatments", value: names.length ? names.join(", ") : "None" },
          ...(tint ? [{ label: "Tint", value: `${values.tint.colour}${values.tint.match ? " · match to sample" : ""}` }] : []),
          ...(values.chemClips.length
            ? [{ label: "Chemistrie (lab instructions)", value: values.chemClips.map((c, i) => `Clip ${i + 1}: ${clipParts(c).join(" · ")}`).join("  |  ") }]
            : []),
        ]} />
      </div>
    );
  }

  return (
    <div className={box}>
      <Fields fields={[
        { label: "Service", value: values.delivery.service === "pri" ? "Priority — 3 working days" : `Standard — ${derived.treat.serviceLead}` },
        { label: "Delivery", value: values.delivery.method },
        ...(values.delivery.notes.trim() ? [{ label: "Notes to the lab", value: values.delivery.notes.trim() }] : []),
      ]} />
    </div>
  );
}
