import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Building2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { day, Field, fieldInputClass, formValues, money } from "@/features/admin/hr/formFields";
import { employeeDisplayName, useEmployees } from "@/features/admin/hr/useEmployees";
import AssetFormDialog from "@/features/admin/finance/assets/AssetFormDialog";
import { periodLabel, projectSchedule } from "@/features/admin/finance/assets/engine";
import {
  ASSET_STATUS_LABELS,
  CONVENTION_LABELS,
  METHOD_LABELS,
  nbv,
  RUN_STATUS_LABELS,
  toEngineAsset,
  useAddAssetNote,
  useAsset,
  useAssetClasses,
  useDeleteAsset,
  useDisposeAsset,
  useSaveAsset,
  type RegisterAsset,
} from "@/features/admin/finance/assets/useAssets";

const EVENT_LABELS: Record<string, string> = {
  opening_balance: "Opening balance",
  acquired: "Added",
  improvement: "Improvement",
  revaluation: "Revaluation",
  impairment: "Impairment",
  transfer: "Transfer",
  life_change: "Life changed",
  disposal: "Disposed",
  write_off: "Written off",
  note: "Note",
};

const today = () => new Date().toISOString().slice(0, 10);

/** The month after the latest charge, or this month if nothing has been charged yet. */
const nextPeriod = (latestCharged: string | undefined) => {
  if (!latestCharged) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  const d = new Date(`${latestCharged.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

const DisposeDialog = ({ asset, onClose }: { asset: RegisterAsset; onClose: () => void }) => {
  const { toast } = useToast();
  const dispose = useDisposeAsset();
  const [writeOff, setWriteOff] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const v = formValues(event.currentTarget);
    try {
      const gain = await dispose.mutateAsync({ assetId: asset.id, on: v.on ?? today(), proceeds: writeOff ? 0 : Number(v.proceeds ?? 0), writeOff, memo: v.memo });
      toast({ title: writeOff ? "Asset written off" : "Asset disposed", description: `${gain >= 0 ? "Gain" : "Loss"} on disposal ${money(Math.abs(gain))}` });
      onClose();
    } catch (error) {
      toast({ title: "Could not dispose asset", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Dispose of {asset.tag}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Depreciation stops at the last approved run. Book value now is {money(nbv(asset))}; the gain or loss is the proceeds less that.
        </p>
        <form id="dispose-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={writeOff} onChange={(e) => setWriteOff(e.target.checked)} className="h-4 w-4" />
            Write off (scrapped, lost or stolen, no proceeds)
          </label>
          <Field label="Date" htmlFor="on"><Input id="on" name="on" type="date" required defaultValue={today()} className={fieldInputClass} /></Field>
          {!writeOff && (
            <Field label="Proceeds (BBD)" htmlFor="proceeds"><Input id="proceeds" name="proceeds" type="number" step="0.01" min="0" defaultValue={0} /></Field>
          )}
          <Field label="Reason / buyer" htmlFor="memo" className="sm:col-span-2"><Textarea id="memo" name="memo" rows={2} /></Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="dispose-form" variant="destructive" disabled={dispose.isPending}>{writeOff ? "Write off" : "Dispose"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-3 py-1.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right">{value || "—"}</dd>
  </div>
);

const AssetDetailPage = () => {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { data, isLoading, error } = useAsset(assetId);
  const { data: classes = [] } = useAssetClasses();
  const { data: employees = [] } = useEmployees();
  const save = useSaveAsset();
  const remove = useDeleteAsset();
  const addNote = useAddAssetNote();
  const [editing, setEditing] = useState(false);
  const [disposing, setDisposing] = useState(false);

  if (error) return <p className="p-4 text-destructive">Could not load asset: {(error as Error).message}</p>;
  if (isLoading || !data) return <p className="p-4 text-muted-foreground">Loading…</p>;

  const { asset, events, charges } = data;
  const book = asset.book;
  const cls = classes.find((c) => c.id === asset.class_id);
  const custodian = employees.find((e) => e.id === asset.custodian_employee_id);
  const engineAsset = toEngineAsset(asset);
  const schedule = engineAsset && asset.status !== "disposed" && asset.status !== "written_off"
    ? projectSchedule(engineAsset.status === "draft" ? { ...engineAsset, status: "in_service" } : engineAsset, nextPeriod(charges[0]?.period), 12)
    : [];

  const putInService = async () => {
    if (!asset.in_service_on) {
      toast({ title: "Set the in-service date first", description: "Edit the asset and fill in “In service from”.", variant: "destructive" });
      return;
    }
    if (!(await confirm({ title: `Put ${asset.tag} in service?`, description: "Its cost and opening balance are then fixed, and it is included in depreciation runs.", confirmLabel: "Put in service" }))) return;
    try {
      await save.mutateAsync({ id: asset.id, asset: { status: "in_service" }, book: {} });
      toast({ title: "Asset in service" });
    } catch (error) {
      toast({ title: "Could not update asset", description: (error as Error).message, variant: "destructive" });
    }
  };

  const deleteDraft = async () => {
    if (!(await confirm({ title: `Delete ${asset.tag}?`, description: "Only drafts can be deleted.", confirmLabel: "Delete", destructive: true }))) return;
    try {
      await remove.mutateAsync(asset.id);
      navigate("/admin/finance/assets");
    } catch (error) {
      toast({ title: "Could not delete asset", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formValues(form);
    if (!v.memo) return;
    try {
      await addNote.mutateAsync({ assetId: asset.id, on: today(), memo: v.memo });
      form.reset();
    } catch (error) {
      toast({ title: "Could not add note", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link to="/admin/finance/assets" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Fixed assets
      </Link>
      <AdminPageHeader icon={Building2} title={`${asset.tag} · ${asset.name}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{ASSET_STATUS_LABELS[asset.status]}</Badge>
          {asset.status === "draft" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => void deleteDraft()}>Delete draft</Button>
              <Button size="sm" variant="outline" onClick={() => void putInService()}>Put in service</Button>
            </>
          )}
          {(asset.status === "draft" || asset.status === "in_service") && <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
          {asset.status === "in_service" && <Button size="sm" variant="outline" onClick={() => setDisposing(true)}>Dispose…</Button>}
        </div>
      </AdminPageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Value</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Detail label="Cost" value={money(asset.cost)} />
              <Detail label="Depreciation to date" value={money(book?.accum_dep ?? 0)} />
              <Detail label="Book value" value={<span className="font-semibold">{money(nbv(asset))}</span>} />
              {book?.opening_as_of && <Detail label={`Opening depreciation at ${day(book.opening_as_of)}`} value={money(book.opening_accum_dep)} />}
              <Detail label="Depreciation goes to" value={asset.expense_target === "cogs" ? "Cost of sales" : "Overhead"} />
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Depreciation</CardTitle></CardHeader>
          <CardContent>
            {book ? (
              <dl className="divide-y">
                <Detail label="Class" value={cls?.name} />
                <Detail label="Method" value={METHOD_LABELS[book.method] + (book.rate_pct ? ` ${book.rate_pct}%` : "")} />
                <Detail label="Useful life" value={`${+(book.useful_life_months / 12).toFixed(2)} years`} />
                <Detail label="Residual value" value={money(book.residual_value)} />
                <Detail label="First-year rule" value={CONVENTION_LABELS[book.convention]} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No depreciation settings.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y">
              <Detail label="Purchased" value={day(asset.acquired_on)} />
              <Detail label="In service from" value={day(asset.in_service_on)} />
              {asset.disposed_on && <Detail label="Disposed" value={day(asset.disposed_on)} />}
              <Detail label="Supplier" value={asset.supplier} />
              <Detail label="Invoice" value={asset.invoice_ref} />
              <Detail label="Make / model" value={[asset.manufacturer, asset.model].filter(Boolean).join(" ")} />
              <Detail label="Serial number" value={asset.serial_no} />
              <Detail label="Location" value={asset.location} />
              <Detail label="Custodian" value={custodian ? employeeDisplayName(custodian) : null} />
              <Detail label="Warranty until" value={asset.warranty_expires_on ? day(asset.warranty_expires_on) : null} />
              {asset.legacy_qbo_account && <Detail label="Former QBO account" value={asset.legacy_qbo_account} />}
            </dl>
          </CardContent>
        </Card>
      </div>

      {(asset.description || asset.notes) && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{[asset.description, asset.notes].filter(Boolean).join("\n\n")}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Next 12 months</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Month</TableHead><TableHead className="text-right">Charge</TableHead><TableHead className="text-right">Book value after</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {schedule.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nothing more to charge.</TableCell></TableRow>
                ) : (
                  schedule.map((r) => (
                    <TableRow key={r.period}>
                      <TableCell>{periodLabel(r.period)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.charge)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(r.nbv)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <p className="px-4 py-2 text-xs text-muted-foreground">A projection from today's totals; the runs decide the actual charges.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Charged so far</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Month</TableHead><TableHead>Run</TableHead><TableHead className="text-right">Charge</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {charges.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No runs yet.</TableCell></TableRow>
                ) : (
                  charges.map((c) => (
                    <TableRow key={c.period}>
                      <TableCell>{periodLabel(c.period)}</TableCell>
                      <TableCell>{RUN_STATUS_LABELS[c.status]}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(c.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <ul className="divide-y text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 py-1.5">
                <span className="w-28 text-muted-foreground">{day(e.occurred_on)}</span>
                <span className="font-medium">{EVENT_LABELS[e.type] ?? e.type}</span>
                {e.amount != null && e.type !== "note" && <span className="tabular-nums">{money(e.amount)}</span>}
                {e.gain_loss != null && <span className="tabular-nums">{e.gain_loss >= 0 ? "gain" : "loss"} {money(Math.abs(e.gain_loss))}</span>}
                {e.memo && <span className="text-muted-foreground">{e.memo}</span>}
              </li>
            ))}
          </ul>
          <form onSubmit={handleNote} className="flex gap-2">
            <Input name="memo" aria-label="Add a note" placeholder="Add a note (moved, repaired, checked…)" />
            <Button type="submit" size="sm" variant="outline" disabled={addNote.isPending}>Add</Button>
          </form>
        </CardContent>
      </Card>

      {editing && <AssetFormDialog asset={asset} onClose={() => setEditing(false)} />}
      {disposing && <DisposeDialog asset={asset} onClose={() => setDisposing(false)} />}
      {confirmDialog}
    </div>
  );
};

export default AssetDetailPage;
