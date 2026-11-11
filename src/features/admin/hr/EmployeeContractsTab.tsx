import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { inAppConfirm } from "@/lib/inAppDialog";
import { day, Field, fieldInputClass, formValues } from "./formFields";
import { FormActions, FormDialog, NativeSelect, Section, useSubmit } from "./formBits";
import { useEmployeeRows, useHrMutation } from "./useEmployees";
import {
  CONTRACT_TYPE_LABELS,
  openHrDocument,
  removeHrDocument,
  uploadHrDocument,
  usePositions,
  type EmployeeContract,
} from "./usePositions";

const EXPIRY_WARNING_DAYS = 60;
const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

const daysUntil = (date: string) => Math.ceil((new Date(`${date}T00:00:00`).getTime() - Date.now()) / 86_400_000);

const expiryBadge = (end: string | null) => {
  if (!end) return null;
  const left = daysUntil(end);
  if (left < 0) return <Badge variant="secondary">Expired</Badge>;
  if (left <= EXPIRY_WARNING_DAYS) return <Badge variant="destructive">Expires in {left} day{left === 1 ? "" : "s"}</Badge>;
  return null;
};

const EmployeeContractsTab = ({ employeeId }: { employeeId: string }) => {
  const { toast } = useToast();
  const { data: contracts = [] } = useEmployeeRows<EmployeeContract>("employee_contracts", employeeId, "start_date");
  const { data: positions = [] } = usePositions();
  const mutate = useHrMutation("employee_contracts");
  const submit = useSubmit();

  const positionOptions = { "": "— None —", ...Object.fromEntries(positions.map((p) => [p.id, `${p.title} · ${p.department}`])) };
  const positionLabel = (id: string | null) => positions.find((p) => p.id === id)?.title;

  const remove = async (c: EmployeeContract) => {
    if (!(await inAppConfirm(`Delete "${c.title}" and its stored file? This cannot be undone.`, { confirmLabel: "Delete", destructive: true }))) return;
    try {
      await mutate.mutateAsync({ deleteId: c.id });
      await removeHrDocument(c.file_path);
    } catch (error) {
      toast({ title: "Could not delete contract", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Contracts"
        action={
          <FormDialog title="Add a contract">
            {(close) => (
        <form
          onSubmit={(event) => {
            const form = event.currentTarget;
            const v = formValues(form);
            const file = (new FormData(form).get("file") as File | null) ?? null;
            return submit(async () => {
              if (!file || file.size === 0) throw new Error("Choose a file to upload.");
              const path = await uploadHrDocument(`contracts/${employeeId}`, file);
              try {
                await mutate.mutateAsync({
                  insert: { employee_id: employeeId, position_id: v.position_id, contract_type: v.contract_type, title: v.title, start_date: v.start_date, end_date: v.end_date, signed_date: v.signed_date, notes: v.notes, file_path: path, file_name: file.name },
                });
              } catch (error) {
                await removeHrDocument(path).catch(() => undefined);
                throw error;
              }
            }, "Contract added", close)(event);
          }}
          className="grid gap-3 sm:grid-cols-3"
        >
          <Field label="Title" htmlFor="title" className="sm:col-span-2"><Input id="title" name="title" required placeholder="e.g. Employment agreement 2026" className={fieldInputClass} /></Field>
          <Field label="Type" htmlFor="contract_type"><NativeSelect id="contract_type" name="contract_type" options={CONTRACT_TYPE_LABELS} /></Field>
          <Field label="Start date" htmlFor="start_date"><Input id="start_date" name="start_date" type="date" /></Field>
          <Field label="End date" htmlFor="end_date"><Input id="end_date" name="end_date" type="date" /></Field>
          <Field label="Signed on" htmlFor="signed_date"><Input id="signed_date" name="signed_date" type="date" /></Field>
          <Field label="Position (optional)" htmlFor="position_id" className="sm:col-span-2"><NativeSelect id="position_id" name="position_id" options={positionOptions} /></Field>
          <Field label="File (PDF, Word or image, up to 20 MB)" htmlFor="file"><Input id="file" name="file" type="file" accept={ACCEPT} required /></Field>
          <Field label="Notes" htmlFor="notes" className="sm:col-span-3"><Textarea id="notes" name="notes" rows={2} /></Field>
          <FormActions submit="Add contract" pending={mutate.isPending} />
        </form>
            )}
          </FormDialog>
        }
      >
        <ul className="divide-y text-sm">
          {contracts.map((c) => (
            <li key={c.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{c.title}</span>
                <Badge variant="outline">{CONTRACT_TYPE_LABELS[c.contract_type]}</Badge>
                {expiryBadge(c.end_date)}
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => openHrDocument(c.file_path).catch((e) => toast({ title: "Could not open file", description: (e as Error).message, variant: "destructive" }))}>
                    Open {c.file_name}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${c.title}`} onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {day(c.start_date)} – {c.end_date ? day(c.end_date) : "open-ended"}
                {c.signed_date && ` · signed ${day(c.signed_date)}`}
                {positionLabel(c.position_id) && ` · ${positionLabel(c.position_id)}`}
              </div>
              {c.notes && <p className="whitespace-pre-wrap text-xs">{c.notes}</p>}
            </li>
          ))}
          {contracts.length === 0 && <li className="py-2 text-muted-foreground">No contracts stored yet.</li>}
        </ul>
      </Section>
    </div>
  );
};

export default EmployeeContractsTab;
