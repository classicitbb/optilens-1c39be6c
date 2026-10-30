import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { employeeDisplayName, useHrMutation, type Employee } from "@/features/admin/hr/useEmployees";
import { day, Field, fieldInputClass, formValues } from "@/features/admin/hr/formFields";
import HelpTip from "@/help/HelpTip";
import {
  leaveBalance,
  workingDaysBetween,
  type LeaveAdjustment,
  type LeavePolicy,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
} from "./leaveBalance";
import { BASIS_LABELS, LEAVE_STATUS_LABELS, PAYROLL_EFFECT_LABELS, today } from "./useLeave";

const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const statusVariant = (s: LeaveStatus) => (s === "approved" ? "default" : s === "requested" ? "secondary" : "outline");

const fmtDays = (n: number | null) => (n == null ? "—" : `${Number(n.toFixed(2))} day${n === 1 ? "" : "s"}`);

/** New leave request. HR entries are usually recorded already approved. */
export const LeaveRequestForm = ({
  employees,
  types,
  policy,
  employeeId,
  onDone,
}: {
  employees: Employee[];
  types: LeaveType[];
  policy: LeavePolicy | undefined;
  employeeId?: string;
  onDone?: () => void;
}) => {
  const { toast } = useToast();
  const mutate = useHrMutation("leave_requests");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const workDays = policy?.work_days ?? [1, 2, 3, 4, 5];
  const suggested = start && end && end >= start ? workingDaysBetween(start, end, workDays) : "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formValues(form);
    const approve = v.approve === "on";
    delete v.approve;
    try {
      const { data } = await supabase.auth.getUser();
      await mutate.mutateAsync({
        insert: {
          ...v,
          employee_id: employeeId ?? v.employee_id,
          days: Number(v.days),
          status: approve ? "approved" : "requested",
          ...(approve ? { decided_by: data.user?.id, decided_at: new Date().toISOString() } : {}),
        },
      });
      toast({ title: approve ? "Leave recorded" : "Leave requested" });
      form.reset();
      setStart("");
      setEnd("");
      onDone?.();
    } catch (error) {
      toast({ title: "Could not save leave", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {!employeeId && (
        <Field label="Employee" htmlFor="leave-employee">
          <select id="leave-employee" name="employee_id" required className={selectClass}>
            <option value="">Choose…</option>
            {employees.filter((e) => e.status !== "terminated").map((e) => <option key={e.id} value={e.id}>{employeeDisplayName(e)}</option>)}
          </select>
        </Field>
      )}
      <Field label="Leave type" htmlFor="leave-type">
        <select id="leave-type" name="leave_type_id" required className={selectClass}>
          {types.filter((t) => t.active).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="First day" htmlFor="leave-start">
        <Input id="leave-start" name="start_date" type="date" required value={start} onChange={(e) => setStart(e.target.value)} className={fieldInputClass} />
      </Field>
      <Field label="Last day" htmlFor="leave-end">
        <Input id="leave-end" name="end_date" type="date" required min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} className={fieldInputClass} />
      </Field>
      <Field label="Working days" htmlFor="leave-days" tip="hr.leave.workingDays">
        {/* Keyed on the suggestion so it refills when the dates change; edit it for public holidays or half days. */}
        <Input key={String(suggested)} id="leave-days" name="days" type="number" step="0.5" min="0.5" required defaultValue={suggested} className={fieldInputClass} />
      </Field>
      <Field label="Reason" htmlFor="leave-reason" className="sm:col-span-2 lg:col-span-3"><Input id="leave-reason" name="reason" /></Field>
      <label htmlFor="leave-approve" className="flex items-center gap-2 text-sm sm:col-span-2">
        <input id="leave-approve" name="approve" type="checkbox" defaultChecked className="h-4 w-4" /> Record as approved
        <HelpTip id="hr.leave.recordApproved" />
      </label>
      <div className="sm:text-right"><Button type="submit" disabled={mutate.isPending}>Save leave</Button></div>
    </form>
  );
};

/** Requests with approve / decline / cancel, each confirmed in an in-app dialog. */
export const LeaveRequestTable = ({
  requests,
  employees,
  types,
  showEmployee = true,
}: {
  requests: LeaveRequest[];
  employees: Employee[];
  types: LeaveType[];
  showEmployee?: boolean;
}) => {
  const { toast } = useToast();
  const mutate = useHrMutation("leave_requests");
  const [deciding, setDeciding] = useState<{ request: LeaveRequest; status: "approved" | "declined" | "cancelled" } | null>(null);
  const [note, setNote] = useState("");
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const typeById = new Map(types.map((t) => [t.id, t]));

  const decide = async () => {
    if (!deciding) return;
    try {
      const { data } = await supabase.auth.getUser();
      await mutate.mutateAsync({
        update: {
          id: deciding.request.id,
          values: { status: deciding.status, decision_note: note || null, decided_by: data.user?.id, decided_at: new Date().toISOString() },
        },
      });
      toast({ title: `Leave ${LEAVE_STATUS_LABELS[deciding.status].toLowerCase()}` });
    } catch (error) {
      toast({ title: "Could not update leave", description: (error as Error).message, variant: "destructive" });
    } finally {
      setDeciding(null);
      setNote("");
    }
  };

  const verb = { approved: "Approve", declined: "Decline", cancelled: "Cancel" } as const;

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showEmployee && <TableHead>Employee</TableHead>}
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.length === 0 && (
              <TableRow><TableCell colSpan={showEmployee ? 6 : 5} className="text-center text-muted-foreground">No leave.</TableCell></TableRow>
            )}
            {requests.map((r) => {
              const employee = employeeById.get(r.employee_id);
              return (
                <TableRow key={r.id}>
                  {showEmployee && (
                    <TableCell className="font-medium">
                      {employee ? <Link to={`/admin/finance/people/${employee.id}`} className="hover:underline">{employeeDisplayName(employee)}</Link> : "—"}
                    </TableCell>
                  )}
                  <TableCell>{typeById.get(r.leave_type_id)?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {day(r.start_date)}{r.end_date !== r.start_date && ` – ${day(r.end_date)}`}
                    {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{Number(r.days)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{LEAVE_STATUS_LABELS[r.status]}</Badge>
                    {r.decision_note && <p className="text-xs text-muted-foreground">{r.decision_note}</p>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {r.status === "requested" && (
                      <>
                        <Button size="sm" variant="outline" className="mr-1" onClick={() => setDeciding({ request: r, status: "approved" })}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeciding({ request: r, status: "declined" })}>Decline</Button>
                      </>
                    )}
                    {r.status === "approved" && <Button size="sm" variant="ghost" onClick={() => setDeciding({ request: r, status: "cancelled" })}>Cancel</Button>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deciding !== null} onOpenChange={(open) => !open && setDeciding(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deciding && `${verb[deciding.status]} ${typeById.get(deciding.request.leave_type_id)?.name.toLowerCase() ?? "leave"}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {deciding && `${day(deciding.request.start_date)} – ${day(deciding.request.end_date)}, ${Number(deciding.request.days)} working days.`}
              {deciding?.status === "cancelled" && " The days go back on the balance; a payroll run already approved is not changed."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea aria-label="Note (optional)" placeholder="Note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => void decide()}>{deciding ? verb[deciding.status] : ""}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/** One card per active leave type: what's available, taken and pending. */
export const LeaveBalanceCards = ({
  employee,
  types,
  policy,
  requests,
  adjustments,
}: {
  employee: Employee;
  types: LeaveType[];
  policy: LeavePolicy | undefined;
  requests: LeaveRequest[];
  adjustments: LeaveAdjustment[];
}) => {
  if (!policy) return null;
  const asOf = today();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {types.filter((t) => t.active).map((t) => {
        const b = leaveBalance(t, employee, policy, requests, adjustments, asOf);
        return (
          <Card key={t.id}>
            <CardContent className="space-y-1 p-4 text-sm">
              <p className="font-medium">{t.name}</p>
              {t.basis === "per_year" ? (
                <>
                  <p className="text-2xl font-semibold tabular-nums">{fmtDays(b.available)}</p>
                  <p className="text-muted-foreground">available · {fmtDays(b.taken)} taken since {day(policy.tracking_from)}</p>
                  {b.next && <p className="text-muted-foreground">+{b.next.days} on {day(b.next.date)}</p>}
                  {!employee.hire_date && <p className="text-amber-700 dark:text-amber-400">Add a hire date to earn leave.</p>}
                </>
              ) : (
                <>
                  <p className="text-2xl font-semibold tabular-nums">{fmtDays(b.taken)}</p>
                  <p className="text-muted-foreground">
                    taken this year{t.basis === "per_event" && t.entitlement_tiers[0] ? ` · ${t.entitlement_tiers[0].days} per occurrence` : ""}
                  </p>
                </>
              )}
              {b.pending > 0 && <p className="text-muted-foreground">{fmtDays(b.pending)} awaiting approval</p>}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

/** Opening balances and corrections, in days (negative to take days off). */
export const LeaveAdjustmentForm = ({ employeeId, types }: { employeeId: string; types: LeaveType[] }) => {
  const { toast } = useToast();
  const mutate = useHrMutation("leave_adjustments");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formValues(form);
    try {
      await mutate.mutateAsync({ insert: { ...v, days: Number(v.days), employee_id: employeeId } });
      toast({ title: "Balance adjusted" });
      form.reset();
    } catch (error) {
      toast({ title: "Could not adjust balance", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Leave type" htmlFor="adj-type">
        <select id="adj-type" name="leave_type_id" required className={selectClass}>
          {types.filter((t) => t.basis === "per_year").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Days (+ or −)" htmlFor="adj-days" tip="hr.leave.adjustDays"><Input id="adj-days" name="days" type="number" step="0.5" required className={fieldInputClass} /></Field>
      <Field label="Effective" htmlFor="adj-date"><Input id="adj-date" name="effective_date" type="date" required defaultValue={today()} className={fieldInputClass} /></Field>
      <Field label="Reason" htmlFor="adj-reason"><Input id="adj-reason" name="reason" required placeholder="Opening balance" className={fieldInputClass} /></Field>
      <div className="lg:col-span-4 lg:text-right"><Button type="submit" variant="outline" disabled={mutate.isPending}>Adjust balance</Button></div>
    </form>
  );
};

const tiersToText = (t: LeaveType) => t.entitlement_tiers.map((x) => `${x.min_years}:${x.days}`).join(", ");
const textToTiers = (text: string | null) =>
  (text ?? "")
    .split(",")
    .map((part) => part.split(":").map((n) => Number(n.trim())))
    .filter(([years, days]) => Number.isFinite(years) && Number.isFinite(days))
    .map(([min_years, days]) => ({ min_years, days }));

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Leave policy and leave types. Defaults follow Barbados law; change them to match contracts. */
export const LeaveSettings = ({ types, policy }: { types: LeaveType[]; policy: LeavePolicy | undefined }) => {
  const { toast } = useToast();
  const typeMutation = useHrMutation("leave_types");
  const [savingPolicy, setSavingPolicy] = useState(false);

  const savePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSavingPolicy(true);
    try {
      const { error } = await (supabase as any)
        .from("leave_policy")
        .update({ tracking_from: data.get("tracking_from"), work_days: data.getAll("work_days").map(Number) })
        .eq("id", true);
      if (error) throw error;
      toast({ title: "Leave policy saved" });
    } catch (error) {
      toast({ title: "Could not save policy", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSavingPolicy(false);
    }
  };

  const saveType = (id: string | null) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formValues(form);
    const values = {
      code: v.code,
      name: v.name,
      basis: v.basis,
      payroll_effect: v.payroll_effect,
      entitlement_tiers: textToTiers(v.tiers),
      carry_over_max_days: v.carry_over_max_days == null ? null : Number(v.carry_over_max_days),
      certificate_after_days: v.certificate_after_days == null ? null : Number(v.certificate_after_days),
      legal_basis: v.legal_basis,
      notes: v.notes,
      active: v.active === "on",
    };
    try {
      await typeMutation.mutateAsync(id ? { update: { id, values } } : { insert: { ...values, sort_order: (types.length + 1) * 10 } });
      toast({ title: "Leave type saved" });
      if (!id) form.reset();
    } catch (error) {
      toast({ title: "Could not save leave type", description: (error as Error).message, variant: "destructive" });
    }
  };

  const typeForm = (t: LeaveType | null) => (
    <form key={t?.id ?? "new"} onSubmit={saveType(t?.id ?? null)} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field label="Name" htmlFor={`name-${t?.id ?? "new"}`}><Input id={`name-${t?.id ?? "new"}`} name="name" required defaultValue={t?.name} className={fieldInputClass} /></Field>
      <Field label="Code" htmlFor={`code-${t?.id ?? "new"}`}><Input id={`code-${t?.id ?? "new"}`} name="code" required defaultValue={t?.code} className={fieldInputClass} /></Field>
      <Field label="Entitlement" htmlFor={`basis-${t?.id ?? "new"}`} tip="hr.leave.basis">
        <select id={`basis-${t?.id ?? "new"}`} name="basis" defaultValue={t?.basis ?? "per_year"} className={selectClass}>
          {Object.entries(BASIS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Pay during leave" htmlFor={`effect-${t?.id ?? "new"}`} tip="hr.leave.payEffect">
        <select id={`effect-${t?.id ?? "new"}`} name="payroll_effect" defaultValue={t?.payroll_effect ?? "paid"} className={selectClass}>
          {Object.entries(PAYROLL_EFFECT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </Field>
      <Field label="Days by years of service (years:days, …)" htmlFor={`tiers-${t?.id ?? "new"}`} tip="hr.leave.tiers">
        <Input id={`tiers-${t?.id ?? "new"}`} name="tiers" defaultValue={t ? tiersToText(t) : ""} placeholder="1:15, 5:20" />
      </Field>
      <Field label="Carry over at most (days, blank = all)" htmlFor={`carry-${t?.id ?? "new"}`} tip="hr.leave.carryOver">
        <Input id={`carry-${t?.id ?? "new"}`} name="carry_over_max_days" type="number" step="0.5" min="0" defaultValue={t?.carry_over_max_days ?? ""} />
      </Field>
      <Field label="Certificate after (days)" htmlFor={`cert-${t?.id ?? "new"}`} tip="hr.leave.certificate">
        <Input id={`cert-${t?.id ?? "new"}`} name="certificate_after_days" type="number" min="0" defaultValue={t?.certificate_after_days ?? ""} />
      </Field>
      <Field label="Legal basis" htmlFor={`law-${t?.id ?? "new"}`}><Input id={`law-${t?.id ?? "new"}`} name="legal_basis" defaultValue={t?.legal_basis ?? ""} /></Field>
      <Field label="Notes" htmlFor={`notes-${t?.id ?? "new"}`} className="sm:col-span-2 lg:col-span-4">
        <Textarea id={`notes-${t?.id ?? "new"}`} name="notes" rows={2} defaultValue={t?.notes ?? ""} />
      </Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={t?.active ?? true} className="h-4 w-4" /> Active</label>
      <div className="sm:col-span-1 lg:col-span-3 lg:text-right"><Button type="submit" size="sm" disabled={typeMutation.isPending}>{t ? "Save" : "Add leave type"}</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      {policy && (
        <form key={`${policy.tracking_from}-${policy.work_days.join()}`} onSubmit={savePolicy} className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
          <Field label="Track balances from" htmlFor="tracking_from" tip="hr.leave.trackingFrom">
            <Input id="tracking_from" name="tracking_from" type="date" required defaultValue={policy.tracking_from} className={fieldInputClass} />
          </Field>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Working days</legend>
            <div className="flex flex-wrap gap-3 pt-2">
              {WEEKDAY_LABELS.map((label, i) => (
                <label key={label} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" name="work_days" value={i + 1} defaultChecked={policy.work_days.includes(i + 1)} className="h-4 w-4" /> {label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground sm:col-span-1">Entitlement before this date isn't counted; add an opening balance per employee instead.</p>
          <div className="sm:text-right"><Button type="submit" size="sm" disabled={savingPolicy}>Save policy</Button></div>
        </form>
      )}
      {types.map(typeForm)}
      <p className="pt-2 text-sm font-medium">New leave type</p>
      {typeForm(null)}
    </div>
  );
};
