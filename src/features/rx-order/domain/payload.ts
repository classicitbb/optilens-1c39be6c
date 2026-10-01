// Moving an order between its two wire shapes.
//
//   cv.rxorder/1  what the prototype engine emits and restores today; persistPayload,
//                 saved drafts, the Lens Assistant handoff and optilens-local all read it.
//   cv.rxorder/2  the typed contract (domain/schema.ts) the React form is built on.
//
// upgradeV1() (schema.ts) goes forward; downgradeToV1() here goes back, so the
// new form can keep feeding the existing save path and the old engine can
// replay anything the new form saved, until the engine is deleted at cutover.
import type { RxOrderV2 } from "./schema";

const rowToV1 = (r: NonNullable<RxOrderV2["rx"]["od"]>) => ({
  sph: r.sph, cyl: r.cyl, axis: r.axis, add: r.add, prism: r.prism, base: r.base,
  pd: r.pd, npd: r.npd, ht: r.height,
});

/**
 * The cv.rxorder/1 shape of a v2 order. Lossy only where v1 has no field:
 * `source` is dropped (`flags` ride along as an extra key). A split lens is re-expressed as the
 * `lens` / `lensOs` / `split` trio v1 readers expect (right eye's lens in
 * `lens`).
 */
export function downgradeToV1(o: RxOrderV2): Record<string, unknown> {
  const od = o.lens.od;
  const os = o.lens.os;
  // v1 keeps one job lens; for an OS-only order that lens is the left eye's.
  const main = od ?? os ?? { material: "", design: "", colour: "" };
  const split = !!(od && os && (od.material !== os.material || od.design !== os.design || od.colour !== os.colour));
  const rx: Record<string, unknown> = {};
  if (o.rx.od) rx.od = rowToV1(o.rx.od);
  if (o.rx.os) rx.os = rowToV1(o.rx.os);
  return {
    schema: "cv.rxorder/1",
    orderNo: o.orderNo,
    rebuiltFrom: o.rebuiltFrom,
    createdAt: o.createdAt,
    account: o.account,
    reference: o.reference,
    patient: o.patient,
    job: o.job,
    frame: o.frame,
    shape: o.shape,
    lens: {
      material: main.material, design: main.design, colour: main.colour,
      diameter: o.lens.advanced.diameter,
      corridor: o.lens.advanced.corridor,
      baseCurve: o.lens.advanced.baseCurve,
    },
    split,
    lensOs: split && os ? { material: os.material, design: os.design, colour: os.colour } : null,
    rx,
    treatments: o.treatments,
    tintConfig: o.tintConfig,
    chemistrie: o.chemistrie,
    ownerReview: o.ownerReview,
    assistance: o.assistance,
    delivery: o.delivery,
    quote: o.quote,
    ...(o.flags.length ? { flags: o.flags } : {}),
  };
}
