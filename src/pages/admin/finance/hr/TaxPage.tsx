import { useState } from "react";
import { Link } from "react-router";
import { Receipt } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HelpTip from "@/help/HelpTip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money } from "@/features/admin/hr/formFields";
import { employeeDisplayName, useEmployees } from "@/features/admin/hr/useEmployees";
import { estimateYear, useTaxYearData } from "@/features/admin/hr/tax/useTax";
import { TAX_YEAR_RULES } from "@/features/admin/hr/tax/annualTax";
import { Private, PrivacyToggle } from "@/features/admin/hr/privacy";

const TaxPage = () => {
  const years = TAX_YEAR_RULES.map((r) => r.year);
  const [year, setYear] = useState(Math.min(new Date().getFullYear(), Math.max(...years)));
  const { data: employees = [] } = useEmployees();
  const { data, isLoading, error } = useTaxYearData(year);
  const active = employees.filter((e) => e.status !== "terminated");

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={Receipt} title="Income tax" tooltip="Each employee's estimated income tax for the year against PAYE withheld, and reliefs they haven't claimed.">
        <label htmlFor="tax-year" className="sr-only">Tax year</label>
        <select id="tax-year" data-tour="hr-tax-year" value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <HelpTip id="hr.tax.year" side="bottom" />
        <PrivacyToggle />
      </AdminPageHeader>

      <div className="overflow-x-auto rounded-md border" data-tour="hr-tax-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Taxable income</TableHead>
              <TableHead className="text-right">Tax for year</TableHead>
              <TableHead className="text-right">PAYE withheld</TableHead>
              <TableHead className="text-right" data-tour="hr-tax-refund"><span className="inline-flex items-center gap-1">Refund / owed <HelpTip id="hr.tax.refund" /></span></TableHead>
              <TableHead data-tour="hr-tax-relief"><span className="inline-flex items-center gap-1">Best unclaimed relief <HelpTip id="hr.tax.relief" /></span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={6} className="text-center text-destructive">Could not load: {(error as Error).message}</TableCell></TableRow>
            ) : isLoading || !data ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : (
              active.map((e) => {
                const { result, months, missingMonths } = estimateYear(e, year, data);
                const best = result.savings[0];
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <Link to={`/admin/finance/people/${e.id}?tab=tax`} className="hover:underline">{employeeDisplayName(e)}</Link>
                      {months.opening === 0 && <p className="text-xs text-amber-700 dark:text-amber-400">Months before the app not entered</p>}
                      {missingMonths > 0 && <p className="text-xs text-amber-700 dark:text-amber-400">{missingMonths} months with no pay figures</p>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums"><Private>{money(result.taxableIncome)}</Private></TableCell>
                    <TableCell className="text-right tabular-nums"><Private>{money(result.tax)}</Private></TableCell>
                    <TableCell className="text-right tabular-nums"><Private>{money(result.payeWithheld)}</Private></TableCell>
                    <TableCell className={`text-right tabular-nums ${result.refund < 0 ? "text-destructive" : ""}`}>
                      <Private>{result.refund < 0 ? `owes ${money(-result.refund)}` : money(result.refund)}</Private>
                    </TableCell>
                    <TableCell className="text-sm"><Private>{best ? `${best.title}: up to ${money(best.saving)}` : "—"}</Private></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Estimates to plan with, not tax returns. Open an employee to enter pay from before the app and their claims.</p>
    </div>
  );
};

export default TaxPage;
