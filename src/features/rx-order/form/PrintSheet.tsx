// The printable order sheet: a plain-paper rendering of the order as it stands.
// It is mounted off-screen in the page and shown only while `body.rx-printing`
// is set (see index.css), so printing needs no pop-up and no second document.
// Everything comes from the derived model; nothing is read from the DOM.
import { clipParts } from "../domain/chemistrie";
import { STD_SHAPES } from "../domain/standardShapes";
import type { Derived } from "./model";
import { OutlinePreview } from "./cards/ShapeBlock";
import { MOUNT_LABELS, SCOPE_LABELS } from "./Summary";
import type { RxCatalog, RxFormValues } from "./types";

type Row = NonNullable<Derived["rows"]["od"]>;
type Pair = [string, string];

const sg = (n: number | null) => (n === null ? "—" : `${n < 0 ? "−" : "+"}${Math.abs(n).toFixed(2)}`);
const mm = (n: number | null) => (n === null ? "—" : n.toFixed(1));
const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Pairs({ rows }: { rows: Pair[] }) {
  return (
    <dl className="rx-print-kv">
      {rows.map(([k, v]) => (
        <div key={k}><dt>{k}</dt><dd>{v || "—"}</dd></div>
      ))}
    </dl>
  );
}

export function PrintSheet({
  values, derived, catalog, orderNo, accountName,
}: {
  values: RxFormValues; derived: Derived; catalog: RxCatalog; orderNo: number | null; accountName: string | null;
}) {
  const { rules, frame } = derived;
  const split = values.lens.split && values.job.eyes === "pair";
  const heightLabel = values.job.vision !== "mf" ? "OC Ht" : rules.isProg ? "Fitting Ht" : "Segment Ht";
  const patient = `${values.patient.first.trim()} ${values.patient.last.trim()}`.trim();
  const lensName = split
    ? `OD ${derived.lens.names[0] ?? "—"} / OS ${derived.lens.names[1] ?? "—"}`
    : derived.lens.names[0] ?? "—";
  const treatments = values.treatments.map((id) => catalog.treatments.find((t) => t.id === id)?.n ?? "Unavailable coating");
  const tint = derived.treat.tintId ? `${values.tint.colour}${values.tint.match ? " · match to sample" : ""}` : "";
  const shapeName = values.shape.source === "standard"
    ? `${STD_SHAPES.find((s) => s.id === values.shape.standardId)?.n ?? "Standard"} — standard shape`
    : values.shape.source === "trace" ? `Traced${values.shape.fileName ? ` · ${values.shape.fileName}` : ""}` : "";
  const service = values.delivery.service === "pri" ? "Priority — 3 working days" : `Standard — ${derived.treat.serviceLead}`;
  const clips = values.chemClips.map((c, i) => `Clip ${i + 1}: ${clipParts(c).join(" · ")}`).join("  |  ");
  const notes = values.delivery.notes.trim();
  const cols: { h: string; show: boolean; c: (r: Row) => string }[] = [
    { h: "Sphere", show: true, c: (r) => sg(r.sph) },
    { h: "Cyl", show: true, c: (r) => sg(r.cyl) },
    { h: "Axis", show: true, c: (r) => (r.axis === null ? "—" : String(r.axis)) },
    { h: "Add", show: rules.needsAdd, c: (r) => sg(r.add) },
    { h: "Dist PD", show: true, c: (r) => mm(r.pd) },
    { h: "Near PD", show: rules.needsNearPD, c: (r) => mm(r.npd) },
    { h: heightLabel, show: true, c: (r) => mm(r.ht) },
    { h: "Prism", show: true, c: (r) => (r.prism ? r.prism.toFixed(2) : "—") },
    { h: "Base", show: true, c: (r) => r.base || "—" },
  ];
  const shown = cols.filter((c) => c.show);

  const lensRows: Pair[] = [
    ["Lens", lensName],
    ["Blank", `${derived.diameter.effective} mm`],
    ["Treatments", treatments.length ? treatments.join(", ") : "None"],
    ...(tint ? [["Tint", tint] as Pair] : []),
    ...(clips ? [["Chemistrie", clips] as Pair] : []),
    ["Frame", `${values.frame.name.trim() || "—"} · A ${mm(frame.a)} B ${mm(frame.b)} ED ${frame.ed === null ? "—" : +frame.ed.toFixed(2)} DBL ${mm(frame.dbl)} · ${MOUNT_LABELS[values.frame.mount] ?? values.frame.mount}`],
    ["Service", `${service} · ${values.delivery.method}`],
    ...(notes ? [["Notes", notes] as Pair] : []),
  ];

  return (
    <div className="rx-print-root" aria-hidden="true" data-testid="rx-print-sheet">
      <div className="rx-print-sheet">
        <header className="rx-print-hd">
          <div>
            <h1>Rx Order Sheet</h1>
            <p>
              <b>No. {orderNo ?? "—"}</b>
              {values.reference.trim() ? ` · Ref ${values.reference.trim()}` : ""} · {new Date().toLocaleDateString()} · {SCOPE_LABELS[values.job.scope]}
            </p>
          </div>
          <div className="rx-print-biz"><b>{accountName ?? "—"}</b>Classic Visions Rx Laboratory</div>
        </header>

        <h2>Patient</h2>
        <Pairs rows={[
          ["Name", patient],
          ["Eyes supplied", values.job.eyes === "pair" ? "Pair (OD + OS)" : values.job.eyes === "od" ? "Right lens only" : "Left lens only"],
        ]} />

        <h2>Prescription</h2>
        <table>
          <thead><tr><th />{shown.map((c) => <th key={c.h}>{c.h}</th>)}</tr></thead>
          <tbody>
            {derived.eyes.map((e) => (
              <tr key={e}><th scope="row">{e.toUpperCase()}</th>{shown.map((c) => <td key={c.h}>{c.c(derived.rows[e]!)}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {values.plusCyl.on && (
          <>
            <p className="rx-print-note">As prescribed — plus cylinder form; converted to minus cylinder above for production.</p>
            <table>
              <thead><tr><th /><th>Sphere</th><th>Cyl</th><th>Axis</th></tr></thead>
              <tbody>
                {derived.eyes.map((e) => (
                  <tr key={e}>
                    <th scope="row">{e.toUpperCase()}</th>
                    <td>{values.plusCyl[e].sph || "—"}</td><td>{values.plusCyl[e].cyl || "—"}</td><td>{values.plusCyl[e].axis || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {frame.geometry && (
          <>
            <h2>Frame shape</h2>
            <div className="rx-print-outline"><OutlinePreview geometry={frame.geometry} /></div>
            <Pairs rows={[
              ["Shape source", shapeName],
              ["Measured", `A ${frame.geometry.a.toFixed(2)} · B ${frame.geometry.b.toFixed(2)} · ED ${frame.geometry.metrics.ed.toFixed(2)} @ ${frame.geometry.metrics.edAxis.toFixed(1)}° · DBL ${frame.geometry.dbl.toFixed(2)} · Circ ${frame.geometry.metrics.circ.toFixed(1)} mm`],
              ["Verified", values.shape.confirmed ? "Confirmed by the dispenser" : "NOT confirmed"],
            ]} />
          </>
        )}

        <h2>Lens</h2>
        <Pairs rows={lensRows} />

        {catalog.pricesVisible ? (
          <div className="rx-print-total">
            <span>Quoted price</span>
            <span>{derived.price.unpriced ? "On request" : `BBD $ ${money(derived.price.sub)}`}</span>
          </div>
        ) : (
          <div className="rx-print-total rx-print-total-quiet"><span>Pricing not enabled on this account</span><span>Confirmed before production</span></div>
        )}
        {values.tint.match && derived.treat.tintId && <p className="rx-print-note">⚑ Contains specialty work pending owner review.</p>}

        <div className="rx-print-sig"><div>Dispenser signature</div><div>Date received at lab</div></div>
        <footer className="rx-print-ft">Classic Visions Rx Laboratory · Barbados</footer>
      </div>
    </div>
  );
}
