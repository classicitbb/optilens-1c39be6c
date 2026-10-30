import type { FormEvent } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useHrMutation, type Employee } from "@/features/admin/hr/useEmployees";
import { Field, formValues, money } from "@/features/admin/hr/formFields";
import { claimsOf, estimateYear, useTaxYearData } from "./useTax";
import type { TaxClaims } from "./annualTax";

const pct = (rate: number) => `${(rate * 100).toFixed(1)}%`;

const AMOUNT_FIELDS: [keyof TaxClaims, string][] = [
  ["tradeUnionDues", "Trade union dues paid"],
  ["medicalExam", "Medical examination cost (age 40+)"],
  ["charitable", "Gifts to registered charities"],
  ["employmentExpenses", "Unreimbursed work travel & entertainment"],
  ["bonusInShares", "Bonus taken as employer shares"],
  ["otherIncome", "Other taxable income"],
];

/** The year's tax estimate for one employee, what they could still claim, and the inputs behind it. */
export const EmployeeTaxPanel = ({ employee, year, readOnly = false }: { employee: Employee; year: number; readOnly?: boolean }) => {
  const { toast } = useToast();
  const { data, isLoading, error } = useTaxYearData(year);
  const mutate = useHrMutation("employee_tax_years");

  if (error) return <p className="text-sm text-destructive">Could not load tax data: {(error as Error).message}</p>;
  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const { row, result, months, missingMonths } = estimateYear(employee, year, data);
  const claims = claimsOf(row);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const v = formValues(event.currentTarget);
    const values = {
      opening_months: Number(v.opening_months ?? 0),
      opening_income: Number(v.opening_income ?? 0),
      opening_paye: Number(v.opening_paye ?? 0),
      notes: v.notes,
      claims: {
        ...Object.fromEntries(AMOUNT_FIELDS.map(([key]) => [key, Number(v[key] ?? 0)])),
        spouseNoIncome: v.spouseNoIncome === "on",
        pensionerOver60: v.pensionerOver60 === "on",
      },
    };
    try {
      await mutate.mutateAsync(row ? { update: { id: row.id, values } } : { insert: { ...values, employee_id: employee.id, year } });
      toast({ title: "Tax details saved" });
    } catch (error) {
      toast({ title: "Could not save tax details", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Taxable income", money(result.taxableIncome)],
          ["Income tax for the year", money(result.tax)],
          ["PAYE withheld", money(result.payeWithheld)],
          [result.refund >= 0 ? "Estimated refund" : "Estimated tax owed", money(Math.abs(result.refund))],
        ].map(([label, value]) => (
          <Card key={label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p></CardContent></Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {months.opening} month{months.opening === 1 ? "" : "s"} entered from before the app · {months.payslips} payslip{months.payslips === 1 ? "" : "s"}
        {months.drafts > 0 && ` (${months.drafts} draft)`} · {months.projected} projected from the latest pay
        {missingMonths > 0 && ` · ${missingMonths} with no figures`} · marginal rate {pct(result.marginalRate)} · {result.rules.source}
      </p>

      {result.savings.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4" /> Ways to pay less tax</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {result.savings.map((s) => (
                <li key={s.key} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span><span className="font-medium">{s.title}.</span> <span className="text-muted-foreground">{s.detail}</span></span>
                  <span className="whitespace-nowrap font-medium tabular-nums">up to {money(s.saving)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">How it's worked out</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            <div className="flex justify-between py-1.5"><dt>Assessable income</dt><dd className="tabular-nums">{money(result.assessableIncome)}</dd></div>
            {result.deductions.map((d) => <div key={d.label} className="flex justify-between py-1.5"><dt>{d.label}</dt><dd className="tabular-nums">−{money(d.amount)}</dd></div>)}
            {result.allowances.map((a) => <div key={a.label} className="flex justify-between py-1.5"><dt>{a.label}</dt><dd className="tabular-nums">−{money(a.amount)}</dd></div>)}
            <div className="flex justify-between py-1.5 font-medium"><dt>Taxable income</dt><dd className="tabular-nums">{money(result.taxableIncome)}</dd></div>
            <div className="flex justify-between py-1.5">
              <dt>Tax: {pct(result.rules.lowerRate)} on the first {money(result.rules.band)}, {pct(result.rules.upperRate)} above</dt>
              <dd className="tabular-nums">{money(result.tax)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {readOnly ? (
        <p className="text-sm text-muted-foreground">To claim an allowance or correct your pay from before the app, tell HR and they'll update it here.</p>
      ) : (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Income, PAYE and claims for {year}</CardTitle></CardHeader>
        <CardContent>
          <form key={row?.id ?? "new"} onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Months paid before the app" htmlFor="opening_months"><Input id="opening_months" name="opening_months" type="number" min="0" max="12" defaultValue={row?.opening_months ?? 0} /></Field>
            <Field label="Taxable pay in those months" htmlFor="opening_income"><Input id="opening_income" name="opening_income" type="number" step="0.01" min="0" defaultValue={row?.opening_income ?? 0} /></Field>
            <Field label="PAYE withheld in those months" htmlFor="opening_paye"><Input id="opening_paye" name="opening_paye" type="number" step="0.01" min="0" defaultValue={row?.opening_paye ?? 0} /></Field>
            {AMOUNT_FIELDS.map(([key, label]) => (
              <Field key={key} label={label} htmlFor={key}><Input id={key} name={key} type="number" step="0.01" min="0" defaultValue={claims[key] as number} /></Field>
            ))}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="spouseNoIncome" defaultChecked={claims.spouseNoIncome} className="h-4 w-4" /> Supports a spouse with no income</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pensionerOver60" defaultChecked={claims.pensionerOver60} className="h-4 w-4" /> Over 60 and receiving a pension</label>
            <Field label="Notes" htmlFor="tax_notes" className="sm:col-span-2 lg:col-span-3"><Textarea id="tax_notes" name="notes" rows={2} defaultValue={row?.notes ?? ""} /></Field>
            <div className="sm:col-span-2 lg:col-span-3 sm:text-right"><Button type="submit" disabled={mutate.isPending}>Save tax details</Button></div>
          </form>
        </CardContent>
      </Card>
      )}
      <p className="text-xs text-muted-foreground">An estimate to plan with, not a tax return. Employees file their own return in TAMIS by 30 April; check the figures against BRA guidance.</p>
    </div>
  );
};
