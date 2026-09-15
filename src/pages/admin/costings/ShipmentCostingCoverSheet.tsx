import { FileStack, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CostingCoverSheetProps = {
  shipmentNumber: string;
  supplier: string;
  reference: string;
  receivedOn: string | null;
  currency: string;
  fobBbd: number;
  freightBbd: number;
  cifBbd: number;
  fxfBbd: number;
  otherChargesBbd: number;
  totalLandedBbd: number;
  multiplier: number;
  status: string;
};

const money = (value: number) => new Intl.NumberFormat("en-BB", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);

/** Printable first page for the digital or physical shipment-costing binder. */
export default function ShipmentCostingCoverSheet(props: CostingCoverSheetProps) {
  const rows = [
    ["FOB / supplier invoice", props.fobBbd],
    ["Insurance & freight", props.freightBbd],
    ["CIF", props.cifBbd],
    ["Foreign exchange fee", props.fxfBbd],
    ["Other landed charges", props.otherChargesBbd],
  ] as const;

  return (
    <div className="mx-auto min-h-[520px] w-full max-w-[760px] bg-white p-8 text-slate-900 shadow-sm ring-1 ring-border print:min-h-0 print:shadow-none">
      <div className="flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Classic Visions</p>
          <h3 className="mt-1 text-2xl font-semibold">Shipment Costing Sheet</h3>
          <p className="mt-1 text-sm text-slate-600">Binder cover and landed-cost summary</p>
        </div>
        <FileStack className="h-8 w-8 text-slate-500" aria-hidden="true" />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Shipment</dt><dd className="mt-1 font-semibold">{props.shipmentNumber || "Draft shipment"}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</dt><dd className="mt-1 capitalize">{props.status}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier</dt><dd className="mt-1">{props.supplier || "Not selected"}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">PO / AWB reference</dt><dd className="mt-1">{props.reference || "Not entered"}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Date received</dt><dd className="mt-1">{props.receivedOn || "Not entered"}</dd></div>
        <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Supplier currency</dt><dd className="mt-1">{props.currency}</dd></div>
      </dl>

      <section className="mt-8">
        <h4 className="border-b pb-2 text-sm font-semibold">Landed cost story</h4>
        <dl className="divide-y text-sm">
          {rows.map(([label, value]) => <div key={label} className="flex items-center justify-between py-2.5"><dt>{label}</dt><dd className="font-mono tabular-nums">BBD {money(value)}</dd></div>)}
          <div className="flex items-center justify-between bg-slate-100 px-3 py-3 font-semibold"><dt>Current total landed</dt><dd className="font-mono tabular-nums">BBD {money(props.totalLandedBbd)}</dd></div>
          <div className="flex items-center justify-between px-3 py-3 font-semibold"><dt>Landed multiplier</dt><dd className="font-mono tabular-nums">×{props.multiplier.toFixed(4)}</dd></div>
        </dl>
      </section>

      <div className="mt-8 flex items-center justify-between border-t pt-4 text-xs text-slate-500">
        <span>This front sheet stays available even when no source document is selected.</span>
        <Button type="button" variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}><Printer className="mr-2 h-3.5 w-3.5" /> Print sheet</Button>
      </div>
    </div>
  );
}
