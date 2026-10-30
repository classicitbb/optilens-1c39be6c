import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Pencil, Trash2, UserRound } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  createContactForEmployee,
  employeeDisplayName,
  revealEmployeeSensitive,
  saveEmployeeSensitive,
  useEmployee,
  useEmployeeRows,
  useEmployees,
  useHrMutation,
  type Compensation,
  type Employee,
  type EmployeeNote,
  type EmployeeSensitive,
  type PaySplit,
  type RecurringItem,
} from "@/features/admin/hr/useEmployees";
import { LeaveAdjustmentForm, LeaveBalanceCards, LeaveRequestForm, LeaveRequestTable } from "@/features/admin/hr/leave/LeaveComponents";
import { EmployeeTaxPanel } from "@/features/admin/hr/tax/TaxComponents";
import { useLeaveAdjustments, useLeavePolicy, useLeaveRequests, useLeaveTypes } from "@/features/admin/hr/leave/useLeave";
import { day, EMPLOYMENT_TYPE_LABELS, Field, fieldInputClass, formValues, money, STATUS_LABELS } from "@/features/admin/hr/formFields";
import { linkEmployeeLogin, useEmployeeLoginEmail } from "@/features/admin/hr/self/useMyHr";

// Native selects keep these forms plain FormData posts.
const NativeSelect = ({ id, name, defaultValue, options }: { id: string; name: string; defaultValue?: string | null; options: Record<string, string> }) => (
  <select id={id} name={name} defaultValue={defaultValue ?? undefined} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
    {Object.entries(options).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
  </select>
);

const useSubmit = () => {
  const { toast } = useToast();
  return (action: () => Promise<unknown>, success: string, onDone?: () => void) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    try {
      await action();
      toast({ title: success });
      form.reset();
      onDone?.();
    } catch (error) {
      toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });
    }
  };
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card>
    <CardHeader className="pb-3"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

const ContactLink = ({ employee }: { employee: Employee }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useHrMutation("employees");
  const [creating, setCreating] = useState(false);

  const link = async (contactId: string) => {
    try {
      await update.mutateAsync({ update: { id: employee.id, values: { contact_id: contactId || null } } });
      toast({ title: contactId ? "Contact linked" : "Contact unlinked" });
    } catch (error) {
      toast({ title: "Could not link contact", description: (error as Error).message, variant: "destructive" });
    }
  };

  const create = async () => {
    setCreating(true);
    try {
      await createContactForEmployee(employee);
      await qc.invalidateQueries({ queryKey: ["hr"] });
      toast({ title: "Contact created and linked" });
    } catch (error) {
      toast({ title: "Could not create contact", description: (error as Error).message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Section title="CRM contact">
      <p className="text-sm text-muted-foreground">A linked contact can't be deleted from the CRM while this employee record points to it.</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-sm"><ContactPickerSelect value={employee.contact_id ?? ""} onValueChange={(id) => void link(id)} placeholder="Link a contact" /></div>
        {employee.contact_id ? (
          <Button asChild variant="outline" size="sm"><Link to={`/admin/crm/contacts?contact=${employee.contact_id}`}>Open contact</Link></Button>
        ) : (
          <Button variant="outline" size="sm" disabled={creating} onClick={() => void create()}>Create contact from employee</Button>
        )}
      </div>
    </Section>
  );
};

const LoginLink = ({ employee }: { employee: Employee }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useHrMutation("employees");
  const { data: email } = useEmployeeLoginEmail(employee.id, !!employee.user_id);
  const [busy, setBusy] = useState(false);

  const link = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    try {
      const linked = await linkEmployeeLogin(employee.id, formValues(form).email ?? "");
      await qc.invalidateQueries({ queryKey: ["hr"] });
      toast({ title: "Login linked", description: `${linked} can now open /me.` });
      form.reset();
    } catch (error) {
      toast({ title: "Could not link login", description: (error as Error).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    try {
      await update.mutateAsync({ update: { id: employee.id, values: { user_id: null } } });
      toast({ title: "Login unlinked" });
    } catch (error) {
      toast({ title: "Could not unlink login", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <Section title="Self-service login">
      <p className="text-sm text-muted-foreground">
        A linked login lets the employee see their own approved payslips, leave and tax estimate at /me, and request leave.
      </p>
      {employee.user_id ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Linked to <span className="font-medium">{email ?? "…"}</span></span>
          <Button variant="outline" size="sm" disabled={update.isPending} onClick={() => void unlink()}>Unlink</Button>
        </div>
      ) : (
        <form onSubmit={link} className="flex flex-wrap items-end gap-2">
          <Field label="Email they sign in with" htmlFor="login-email">
            <Input id="login-email" name="email" type="email" required defaultValue={employee.email ?? ""} className="w-72" />
          </Field>
          <Button type="submit" size="sm" disabled={busy}>Link login</Button>
        </form>
      )}
    </Section>
  );
};

const ProfileTab = ({ employeeId }: { employeeId: string }) => {
  const { data: employee } = useEmployee(employeeId);
  const { data: employees = [] } = useEmployees();
  const update = useHrMutation("employees");
  const submit = useSubmit();
  if (!employee) return null;

  const managers = Object.fromEntries([["", "— None —"], ...employees.filter((e) => e.id !== employee.id).map((e) => [e.id, employeeDisplayName(e)])]);

  return (
    <form
      key={employee.updated_at}
      onSubmit={(event) => {
        const values: Record<string, unknown> = formValues(event.currentTarget);
        // An unticked checkbox is left out of the form data entirely.
        values.rr_levy_exempt = values.rr_levy_exempt === "on";
        return submit(() => update.mutateAsync({ update: { id: employee.id, values } }), "Profile saved")(event);
      }}
      className="space-y-4"
    >
      <Section title="Personal">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="First name" htmlFor="first_name"><Input id="first_name" name="first_name" required defaultValue={employee.first_name} className={fieldInputClass} /></Field>
          <Field label="Last name" htmlFor="last_name"><Input id="last_name" name="last_name" required defaultValue={employee.last_name} className={fieldInputClass} /></Field>
          <Field label="Preferred name" htmlFor="preferred_name"><Input id="preferred_name" name="preferred_name" defaultValue={employee.preferred_name ?? ""} /></Field>
          <Field label="Date of birth" htmlFor="date_of_birth"><Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={employee.date_of_birth ?? ""} /></Field>
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" defaultValue={employee.email ?? ""} className={fieldInputClass} /></Field>
          <Field label="Phone" htmlFor="phone"><Input id="phone" name="phone" type="tel" defaultValue={employee.phone ?? ""} /></Field>
          <Field label="Address" htmlFor="address" className="sm:col-span-2 lg:col-span-3"><Textarea id="address" name="address" rows={2} defaultValue={employee.address ?? ""} /></Field>
        </div>
      </Section>
      <Section title="Job">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Employee no." htmlFor="employee_no"><Input id="employee_no" name="employee_no" defaultValue={employee.employee_no ?? ""} /></Field>
          <Field label="Job title" htmlFor="job_title"><Input id="job_title" name="job_title" defaultValue={employee.job_title ?? ""} /></Field>
          <Field label="Department" htmlFor="department"><Input id="department" name="department" defaultValue={employee.department ?? ""} /></Field>
          <Field label="Manager" htmlFor="manager_id"><NativeSelect id="manager_id" name="manager_id" defaultValue={employee.manager_id ?? ""} options={managers} /></Field>
          <Field label="Employment type" htmlFor="employment_type"><NativeSelect id="employment_type" name="employment_type" defaultValue={employee.employment_type} options={EMPLOYMENT_TYPE_LABELS} /></Field>
          <Field label="Status" htmlFor="status"><NativeSelect id="status" name="status" defaultValue={employee.status} options={STATUS_LABELS} /></Field>
          <Field label="Hire date" htmlFor="hire_date"><Input id="hire_date" name="hire_date" type="date" defaultValue={employee.hire_date ?? ""} /></Field>
          <Field label="Termination date" htmlFor="termination_date"><Input id="termination_date" name="termination_date" type="date" defaultValue={employee.termination_date ?? ""} /></Field>
          <Field label="Tax code" htmlFor="tax_code"><Input id="tax_code" name="tax_code" defaultValue={employee.tax_code ?? ""} /></Field>
          <label htmlFor="rr_levy_exempt" className="flex items-center gap-2 self-end pb-2 text-sm">
            <input id="rr_levy_exempt" name="rr_levy_exempt" type="checkbox" defaultChecked={employee.rr_levy_exempt} className="h-4 w-4" />
            Exempt from R&amp;R levy
          </label>
          <Field label="Termination reason" htmlFor="termination_reason" className="sm:col-span-2 lg:col-span-3"><Input id="termination_reason" name="termination_reason" defaultValue={employee.termination_reason ?? ""} /></Field>
        </div>
      </Section>
      <div className="flex justify-end"><Button type="submit" disabled={update.isPending}>Save profile</Button></div>
    </form>
  );
};
const CompensationTab = ({ employeeId }: { employeeId: string }) => {
  const { data: rows = [] } = useEmployeeRows<Compensation>("employee_compensation", employeeId, "effective_from");
  const mutate = useHrMutation("employee_compensation");
  const submit = useSubmit();
  const current = rows.find((r) => !r.effective_to);

  return (
    <div className="space-y-4">
      <Section title="Current pay">
        {current ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Base ({current.pay_frequency.replace("_", "-")})</dt><dd className="text-lg font-semibold">{money(current.base_amount, current.currency)}</dd></div>
            <div><dt className="text-muted-foreground">Annual allowances</dt><dd>{money(current.annual_personal_allowance + current.annual_child_allowance + current.annual_other_allowance, current.currency)}</dd></div>
            <div><dt className="text-muted-foreground">Effective from</dt><dd>{day(current.effective_from)}</dd></div>
          </dl>
        ) : <p className="text-sm text-muted-foreground">No pay set up yet.</p>}
      </Section>

      <Section title="Change pay">
        <form
          onSubmit={(event) => {
            const v = formValues(event.currentTarget);
            return submit(async () => {
              // Close the open record the day before the new one starts.
              if (current && v.effective_from) {
                const end = new Date(`${v.effective_from}T00:00:00`);
                end.setDate(end.getDate() - 1);
                await mutate.mutateAsync({ update: { id: current.id, values: { effective_to: end.toISOString().slice(0, 10) } } });
              }
              await mutate.mutateAsync({ insert: { ...v, employee_id: employeeId } });
            }, "Pay updated")(event);
          }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Pay type" htmlFor="pay_type"><NativeSelect id="pay_type" name="pay_type" defaultValue={current?.pay_type} options={{ salary: "Salary", hourly: "Hourly" }} /></Field>
          <Field label="Frequency" htmlFor="pay_frequency"><NativeSelect id="pay_frequency" name="pay_frequency" defaultValue={current?.pay_frequency} options={{ monthly: "Monthly", semi_monthly: "Semi-monthly", fortnightly: "Fortnightly", weekly: "Weekly" }} /></Field>
          <Field label="Base amount" htmlFor="base_amount"><Input id="base_amount" name="base_amount" type="number" step="0.01" min="0" required className={fieldInputClass} /></Field>
          <Field label="Effective from" htmlFor="effective_from"><Input id="effective_from" name="effective_from" type="date" required className={fieldInputClass} /></Field>
          <Field label="Personal allowance (yr)" htmlFor="annual_personal_allowance"><Input id="annual_personal_allowance" name="annual_personal_allowance" type="number" step="0.01" min="0" defaultValue={current?.annual_personal_allowance ?? 0} /></Field>
          <Field label="Child allowance (yr)" htmlFor="annual_child_allowance"><Input id="annual_child_allowance" name="annual_child_allowance" type="number" step="0.01" min="0" defaultValue={current?.annual_child_allowance ?? 0} /></Field>
          <Field label="Other allowance (yr)" htmlFor="annual_other_allowance"><Input id="annual_other_allowance" name="annual_other_allowance" type="number" step="0.01" min="0" defaultValue={current?.annual_other_allowance ?? 0} /></Field>
          <Field label="Reason" htmlFor="reason"><Input id="reason" name="reason" placeholder="e.g. Annual review" /></Field>
          <div className="flex items-end lg:col-span-4 lg:justify-end"><Button type="submit" disabled={mutate.isPending}>Save pay change</Button></div>
        </form>
      </Section>

      <Section title="History">
        <ul className="divide-y text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{day(r.effective_from)} – {r.effective_to ? day(r.effective_to) : "now"}</span>
              <span className="font-medium">{money(r.base_amount, r.currency)} / {r.pay_frequency.replace("_", "-")}</span>
              <span className="text-muted-foreground">{r.reason ?? ""}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="py-2 text-muted-foreground">No history.</li>}
        </ul>
      </Section>
    </div>
  );
};

const PayItemsTab = ({ employeeId }: { employeeId: string }) => {
  const { data: items = [] } = useEmployeeRows<RecurringItem>("employee_recurring_items", employeeId);
  const { data: splits = [] } = useEmployeeRows<PaySplit>("employee_pay_splits", employeeId, "sort_order");
  const itemMutation = useHrMutation("employee_recurring_items");
  const splitMutation = useHrMutation("employee_pay_splits");
  const submit = useSubmit();

  return (
    <div className="space-y-4">
      <Section title="Recurring earnings & deductions">
        <ul className="divide-y text-sm">
          {items.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 py-2">
              <Badge variant={i.kind === "earning" ? "default" : "secondary"}>{i.kind}</Badge>
              <span className="font-medium">{i.label}</span>
              <span>{i.amount != null ? money(i.amount) : `${i.percent}%`}</span>
              {!i.taxable && <span className="text-xs text-muted-foreground">non-taxable</span>}
              {i.loan_balance != null && <span className="text-xs text-muted-foreground">balance {money(i.loan_balance)}</span>}
              {!i.active && <Badge variant="outline">inactive</Badge>}
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => itemMutation.mutate({ update: { id: i.id, values: { active: !i.active } } })}>
                {i.active ? "Deactivate" : "Reactivate"}
              </Button>
            </li>
          ))}
          {items.length === 0 && <li className="py-2 text-muted-foreground">None.</li>}
        </ul>
        <form
          onSubmit={(event) => {
            const v = formValues(event.currentTarget);
            const taxable = v.taxable === "on";
            delete v.taxable;
            return submit(() => itemMutation.mutateAsync({ insert: { ...v, taxable, employee_id: employeeId, loan_balance: v.loan_principal } }), "Item added")(event);
          }}
          className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Field label="Type" htmlFor="kind"><NativeSelect id="kind" name="kind" options={{ deduction: "Deduction", earning: "Earning" }} /></Field>
          <Field label="Label" htmlFor="label"><Input id="label" name="label" required placeholder="Health insurance" className={fieldInputClass} /></Field>
          <Field label="Amount per pay" htmlFor="amount"><Input id="amount" name="amount" type="number" step="0.01" min="0" required className={fieldInputClass} /></Field>
          <Field label="Loan principal (optional)" htmlFor="loan_principal"><Input id="loan_principal" name="loan_principal" type="number" step="0.01" min="0" /></Field>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="taxable" defaultChecked /> Taxable</label>
          <div className="lg:col-span-5 lg:text-right"><Button type="submit" disabled={itemMutation.isPending}>Add item</Button></div>
        </form>
      </Section>

      <Section title="Net pay distribution">
        <ul className="divide-y text-sm">
          {splits.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground">{s.method.replace("_", " ")}</span>
              <span>{s.is_remainder ? "Remainder" : money(s.amount)}</span>
              <Button variant="ghost" size="icon" className="ml-auto" aria-label={`Remove ${s.label}`} onClick={() => splitMutation.mutate({ deleteId: s.id })}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
          {splits.length === 0 && <li className="py-2 text-muted-foreground">Not set: all net pay goes to one account.</li>}
        </ul>
        <form
          onSubmit={(event) => {
            const v = formValues(event.currentTarget);
            const is_remainder = !v.amount;
            return submit(() => splitMutation.mutateAsync({ insert: { ...v, is_remainder, employee_id: employeeId, sort_order: splits.length } }), "Split added")(event);
          }}
          className="grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Label" htmlFor="split_label"><Input id="split_label" name="label" required placeholder="CIBC savings" className={fieldInputClass} /></Field>
          <Field label="Method" htmlFor="method"><NativeSelect id="method" name="method" options={{ bank_transfer: "Bank transfer", cheque: "Cheque", cash: "Cash", third_party: "Third party" }} /></Field>
          <Field label="Fixed amount (blank = remainder)" htmlFor="split_amount"><Input id="split_amount" name="amount" type="number" step="0.01" min="0" /></Field>
          <div className="flex items-end"><Button type="submit" disabled={splitMutation.isPending}>Add split</Button></div>
        </form>
      </Section>
    </div>
  );
};

const SENSITIVE_FIELDS: [keyof EmployeeSensitive, string][] = [
  ["national_registration_no", "National registration no."],
  ["nis_no", "NIS no."],
  ["tax_file_no", "Tax file / TAMIS no."],
  ["bank_name", "Bank"],
  ["bank_branch", "Branch"],
  ["bank_account_no", "Account no."],
];

const IdentityTab = ({ employeeId }: { employeeId: string }) => {
  const { toast } = useToast();
  const [values, setValues] = useState<EmployeeSensitive | null>(null);
  const [loading, setLoading] = useState(false);
  const submit = useSubmit();

  const reveal = async () => {
    setLoading(true);
    try {
      const row = await revealEmployeeSensitive(employeeId);
      setValues(row?.employee_id ? row : { employee_id: employeeId, national_registration_no: null, nis_no: null, tax_file_no: null, bank_name: null, bank_branch: null, bank_account_no: null });
    } catch (error) {
      toast({ title: "Could not load", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!values) {
    return (
      <Section title="IDs & bank details">
        <p className="text-sm text-muted-foreground">These details are hidden. Showing them is recorded in the audit log.</p>
        <Button variant="outline" onClick={reveal} disabled={loading}><Eye className="mr-1 h-4 w-4" /> Show details</Button>
      </Section>
    );
  }

  return (
    <Section title="IDs & bank details">
      <form
        onSubmit={(event) => {
          const v = formValues(event.currentTarget) as Omit<EmployeeSensitive, "employee_id">;
          return submit(() => saveEmployeeSensitive({ ...v, employee_id: employeeId }), "Details saved", () => setValues(null))(event);
        }}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {SENSITIVE_FIELDS.map(([key, label]) => (
          <Field key={key} label={label} htmlFor={key}><Input id={key} name={key} defaultValue={values[key] ?? ""} autoComplete="off" /></Field>
        ))}
        <div className="flex justify-end gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="button" variant="outline" onClick={() => setValues(null)}>Hide</Button>
          <Button type="submit">Save details</Button>
        </div>
      </form>
    </Section>
  );
};

const NOTE_CATEGORIES = { general: "General", check_in: "Check-in", commendation: "Commendation", disciplinary: "Disciplinary" };
const NOTE_VISIBILITY = { hr_only: "HR only", shared: "Shared with employee" };

const NotesTab = ({ employeeId }: { employeeId: string }) => {
  const { data: notes = [] } = useEmployeeRows<EmployeeNote>("employee_notes", employeeId);
  const mutate = useHrMutation("employee_notes");
  const submit = useSubmit();
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Section title="Notes">
      <form
        onSubmit={(event) => {
          const v = formValues(event.currentTarget);
          return submit(() => mutate.mutateAsync({ insert: { ...v, employee_id: employeeId } }), "Note added")(event);
        }}
        className="grid gap-3 sm:grid-cols-3"
      >
        <Field label="Category" htmlFor="category"><NativeSelect id="category" name="category" options={NOTE_CATEGORIES} /></Field>
        <Field label="Visibility" htmlFor="visibility"><NativeSelect id="visibility" name="visibility" options={NOTE_VISIBILITY} /></Field>
        <Field label="Note" htmlFor="body" className="sm:col-span-3"><Textarea id="body" name="body" required rows={3} className={fieldInputClass} /></Field>
        <div className="sm:col-span-3 sm:text-right"><Button type="submit" disabled={mutate.isPending}>Add note</Button></div>
      </form>
      <ul className="divide-y text-sm">
        {notes.map((n) =>
          editingId === n.id ? (
            <li key={n.id} className="py-3">
              <form
                onSubmit={(event) => {
                  const v = formValues(event.currentTarget);
                  return submit(() => mutate.mutateAsync({ update: { id: n.id, values: v } }), "Note updated", () => setEditingId(null))(event);
                }}
                className="grid gap-3 sm:grid-cols-3"
              >
                <Field label="Category" htmlFor={`category-${n.id}`}><NativeSelect id={`category-${n.id}`} name="category" defaultValue={n.category} options={NOTE_CATEGORIES} /></Field>
                <Field label="Visibility" htmlFor={`visibility-${n.id}`}><NativeSelect id={`visibility-${n.id}`} name="visibility" defaultValue={n.visibility} options={NOTE_VISIBILITY} /></Field>
                <Field label="Note" htmlFor={`body-${n.id}`} className="sm:col-span-3"><Textarea id={`body-${n.id}`} name="body" required rows={3} defaultValue={n.body} className={fieldInputClass} /></Field>
                <div className="flex justify-end gap-2 sm:col-span-3">
                  <Button type="button" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                  <Button type="submit" disabled={mutate.isPending}>Save note</Button>
                </div>
              </form>
            </li>
          ) : (
            <li key={n.id} className="space-y-1 py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{n.category.replace("_", "-")}</Badge>
                <span>{day(n.created_at)}</span>
                {n.updated_at && <span>· edited {day(n.updated_at)}</span>}
                {n.visibility === "shared" && <span>· shared</span>}
                <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label="Edit note" onClick={() => setEditingId(n.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="whitespace-pre-wrap">{n.body}</p>
            </li>
          ),
        )}
      </ul>
    </Section>
  );
};

const LeaveTab = ({ employee }: { employee: Employee }) => {
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useLeaveTypes();
  const { data: policy } = useLeavePolicy();
  const { data: requests = [] } = useLeaveRequests(employee.id);
  const { data: adjustments = [] } = useLeaveAdjustments(employee.id);

  return (
    <div className="space-y-4">
      <LeaveBalanceCards employee={employee} types={types} policy={policy} requests={requests} adjustments={adjustments} />
      <Section title="Record leave">
        <LeaveRequestForm employees={employees} types={types} policy={policy} employeeId={employee.id} />
      </Section>
      <Section title="Leave history">
        <LeaveRequestTable requests={requests} employees={employees} types={types} showEmployee={false} />
      </Section>
      <Section title="Balance adjustments">
        <ul className="divide-y text-sm">
          {adjustments.map((a) => (
            <li key={a.id} className="flex flex-wrap gap-3 py-2">
              <span>{day(a.effective_date)}</span>
              <span className="font-medium tabular-nums">{a.days > 0 ? "+" : ""}{Number(a.days)} days</span>
              <span>{types.find((t) => t.id === a.leave_type_id)?.name}</span>
              <span className="text-muted-foreground">{a.reason}</span>
            </li>
          ))}
          {adjustments.length === 0 && <li className="py-2 text-muted-foreground">None. Add an opening balance for leave owed before tracking started.</li>}
        </ul>
        <LeaveAdjustmentForm employeeId={employee.id} types={types} />
      </Section>
    </div>
  );
};

const EmployeeDetailPage = () => {
  const { employeeId = "" } = useParams();
  const { data: employee, isLoading } = useEmployee(employeeId);
  const [searchParams] = useSearchParams();

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading…</div>;
  if (!employee) return <div className="p-4">Employee not found. <Link to="/admin/finance/people" className="underline">Back to People</Link></div>;

  return (
    <div className="flex flex-col gap-4 p-4">
      <Link to="/admin/finance/people" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="h-4 w-4" /> People
      </Link>
      <AdminPageHeader icon={UserRound} title={employeeDisplayName(employee)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {employee.job_title && <span>{employee.job_title}</span>}
          <Badge variant={employee.status === "active" ? "default" : "outline"}>{STATUS_LABELS[employee.status]}</Badge>
        </div>
      </AdminPageHeader>

      <Tabs defaultValue={searchParams.get("tab") ?? "profile"}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="pay">Compensation</TabsTrigger>
          <TabsTrigger value="items">Pay items</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="ids">IDs & bank</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4">
          <ProfileTab employeeId={employeeId} />
          <ContactLink employee={employee} />
          <LoginLink employee={employee} />
        </TabsContent>
        <TabsContent value="pay"><CompensationTab employeeId={employeeId} /></TabsContent>
        <TabsContent value="items"><PayItemsTab employeeId={employeeId} /></TabsContent>
        <TabsContent value="leave"><LeaveTab employee={employee} /></TabsContent>
        <TabsContent value="tax"><EmployeeTaxPanel employee={employee} year={new Date().getFullYear()} /></TabsContent>
        <TabsContent value="ids"><IdentityTab employeeId={employeeId} /></TabsContent>
        <TabsContent value="notes"><NotesTab employeeId={employeeId} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetailPage;
