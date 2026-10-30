import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Field, fieldInputClass, formValues } from "@/features/admin/hr/formFields";
import { employeeDisplayName, useEmployees } from "@/features/admin/hr/useEmployees";
import { CONVENTION_LABELS, METHOD_LABELS, useAssetClasses, useSaveAsset, type RegisterAsset } from "./useAssets";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

/** Add or edit an asset and its accounting book. Cost and opening balance are fixed once in service. */
const AssetFormDialog = ({ asset, onClose, onSaved }: { asset?: RegisterAsset; onClose: () => void; onSaved?: (id: string) => void }) => {
  const { toast } = useToast();
  const { data: classes = [] } = useAssetClasses();
  const { data: employees = [] } = useEmployees();
  const save = useSaveAsset();
  const [classId, setClassId] = useState(asset?.class_id ?? "");
  const [method, setMethod] = useState(asset?.book?.method ?? "straight_line");
  const draft = !asset || asset.status === "draft";
  const cls = classes.find((c) => c.id === classId);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const v = formValues(event.currentTarget);
    const lifeMonths = Math.round(Number(v.life_years) * 12);
    const values: Record<string, unknown> = {
      name: v.name,
      class_id: v.class_id,
      description: v.description,
      serial_no: v.serial_no,
      manufacturer: v.manufacturer,
      model: v.model,
      location: v.location,
      custodian_employee_id: v.custodian_employee_id,
      supplier: v.supplier,
      invoice_ref: v.invoice_ref,
      acquired_on: v.acquired_on,
      in_service_on: v.in_service_on,
      warranty_expires_on: v.warranty_expires_on,
      expense_target: v.expense_target,
      notes: v.notes,
    };
    if (draft) values.cost = Number(v.cost);
    const book: Record<string, unknown> = {
      method: v.method,
      useful_life_months: lifeMonths,
      residual_value: Number(v.residual_value ?? 0),
      rate_pct: v.method === "declining_balance" ? Number(v.rate_pct) : null,
      convention: v.convention,
    };
    if (draft) {
      book.opening_accum_dep = Number(v.opening_accum_dep ?? 0);
      book.opening_as_of = Number(v.opening_accum_dep ?? 0) > 0 ? v.opening_as_of : null;
    }
    try {
      const id = await save.mutateAsync({ id: asset?.id, asset: values, book });
      toast({ title: asset ? "Asset saved" : "Asset added", description: asset ? undefined : "It stays a draft until you put it in service." });
      onSaved?.(id);
      onClose();
    } catch (error) {
      toast({ title: "Could not save asset", description: (error as Error).message, variant: "destructive" });
    }
  };

  const b = asset?.book;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{asset ? `Edit ${asset.tag}` : "New asset"}</DialogTitle></DialogHeader>
        <form id="asset-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" className="sm:col-span-2">
            <Input id="name" name="name" required defaultValue={asset?.name} className={fieldInputClass} />
          </Field>
          <Field label="Class" htmlFor="class_id">
            <select id="class_id" name="class_id" required value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
              <option value="" disabled>Choose a class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Depreciation goes to" htmlFor="expense_target">
            <select id="expense_target" name="expense_target" defaultValue={asset?.expense_target ?? "overhead"} className={selectClass}>
              <option value="overhead">Overhead</option>
              <option value="cogs">Cost of sales (lab, production)</option>
            </select>
          </Field>
          <Field label="Cost (BBD, incl. landed cost)" htmlFor="cost">
            <Input id="cost" name="cost" type="number" step="0.01" min="0" required disabled={!draft} defaultValue={asset?.cost} className={fieldInputClass} />
          </Field>
          <Field label="Supplier" htmlFor="supplier"><Input id="supplier" name="supplier" defaultValue={asset?.supplier ?? ""} /></Field>
          <Field label="Purchase date" htmlFor="acquired_on"><Input id="acquired_on" name="acquired_on" type="date" defaultValue={asset?.acquired_on ?? ""} /></Field>
          <Field label="In service from" htmlFor="in_service_on"><Input id="in_service_on" name="in_service_on" type="date" defaultValue={asset?.in_service_on ?? ""} /></Field>
          <Field label="Invoice reference" htmlFor="invoice_ref"><Input id="invoice_ref" name="invoice_ref" defaultValue={asset?.invoice_ref ?? ""} /></Field>
          <Field label="Warranty expires" htmlFor="warranty_expires_on"><Input id="warranty_expires_on" name="warranty_expires_on" type="date" defaultValue={asset?.warranty_expires_on ?? ""} /></Field>
          <Field label="Manufacturer" htmlFor="manufacturer"><Input id="manufacturer" name="manufacturer" defaultValue={asset?.manufacturer ?? ""} /></Field>
          <Field label="Model" htmlFor="model"><Input id="model" name="model" defaultValue={asset?.model ?? ""} /></Field>
          <Field label="Serial number" htmlFor="serial_no"><Input id="serial_no" name="serial_no" defaultValue={asset?.serial_no ?? ""} /></Field>
          <Field label="Location" htmlFor="location"><Input id="location" name="location" defaultValue={asset?.location ?? ""} placeholder="e.g. Lab, Front office" /></Field>
          <Field label="Custodian" htmlFor="custodian_employee_id">
            <select id="custodian_employee_id" name="custodian_employee_id" defaultValue={asset?.custodian_employee_id ?? ""} className={selectClass}>
              <option value="">Nobody</option>
              {employees.filter((e) => e.status !== "terminated").map((e) => <option key={e.id} value={e.id}>{employeeDisplayName(e)}</option>)}
            </select>
          </Field>

          <fieldset className="grid gap-3 border-t pt-3 sm:col-span-2 sm:grid-cols-2">
            <legend className="text-sm font-medium">Depreciation</legend>
            <Field label="Method" htmlFor="method">
              <select id="method" name="method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className={selectClass}>
                {Object.entries(METHOD_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </Field>
            <Field label="Useful life (years)" htmlFor="life_years">
              <Input id="life_years" name="life_years" type="number" step="0.25" min="0.25" required
                key={classId} defaultValue={b ? b.useful_life_months / 12 : cls ? cls.default_life_months / 12 : ""} className={fieldInputClass} />
            </Field>
            <Field label="Residual value" htmlFor="residual_value">
              <Input id="residual_value" name="residual_value" type="number" step="0.01" min="0" defaultValue={b?.residual_value ?? 0} />
            </Field>
            {method === "declining_balance" && (
              <Field label="Rate per year (%)" htmlFor="rate_pct">
                <Input id="rate_pct" name="rate_pct" type="number" step="0.01" min="0.01" required defaultValue={b?.rate_pct ?? ""} className={fieldInputClass} />
              </Field>
            )}
            <Field label="First-year rule" htmlFor="convention">
              <select id="convention" name="convention" defaultValue={b?.convention ?? "full_year"} className={selectClass}>
                {Object.entries(CONVENTION_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </Field>
            {draft && (
              <>
                <Field label="Depreciation already charged (if any)" htmlFor="opening_accum_dep">
                  <Input id="opening_accum_dep" name="opening_accum_dep" type="number" step="0.01" min="0" defaultValue={b?.opening_accum_dep ?? 0} />
                </Field>
                <Field label="…charged up to" htmlFor="opening_as_of">
                  <Input id="opening_as_of" name="opening_as_of" type="date" defaultValue={b?.opening_as_of ?? ""} />
                </Field>
              </>
            )}
          </fieldset>

          <Field label="Description" htmlFor="description" className="sm:col-span-2">
            <Textarea id="description" name="description" rows={2} defaultValue={asset?.description ?? ""} />
          </Field>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={2} defaultValue={asset?.notes ?? ""} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="asset-form" disabled={save.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssetFormDialog;
