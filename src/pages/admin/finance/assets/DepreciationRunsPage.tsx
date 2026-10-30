import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Building2, Plus } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { day, Field, fieldInputClass, formValues } from "@/features/admin/hr/formFields";
import { AssetsNav } from "@/features/admin/finance/assets/AssetsRoute";
import { periodLabel } from "@/features/admin/finance/assets/engine";
import { RUN_STATUS_LABELS, useCreateDepreciationRun, useDepreciationRuns } from "@/features/admin/finance/assets/useAssets";

// The register starts from QBO balances at 31 Oct 2026, so the first run is November.
const FIRST_PERIOD = "2026-11";

const nextPeriod = (latest: string | undefined) => {
  if (!latest) return FIRST_PERIOD;
  const d = new Date(`${latest.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const DepreciationRunsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: runs = [], isLoading, error } = useDepreciationRuns();
  const createRun = useCreateDepreciationRun();
  const [adding, setAdding] = useState(false);
  const openDraft = runs.find((r) => r.status === "draft");

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const v = formValues(event.currentTarget);
    try {
      const run = await createRun.mutateAsync(`${v.period}-01`);
      setAdding(false);
      navigate(`/admin/finance/assets/runs/${run.id}`);
    } catch (error) {
      toast({ title: "Could not start depreciation run", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={Building2} title="Depreciation runs" tooltip="One run a month. Approving adds the charges to each asset and locks the run; the journal then goes to QBO.">
        <Button size="sm" disabled={!!openDraft} title={openDraft ? "Finish the open draft first" : undefined} onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> New run
        </Button>
      </AdminPageHeader>
      <AssetsNav />

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>QBO journal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={4} className="text-center text-destructive">Could not load runs: {(error as Error).message}</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : runs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No runs yet. The first is for November 2026.</TableCell></TableRow>
            ) : (
              runs.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/finance/assets/runs/${r.id}`)}>
                  <TableCell className="font-medium">
                    <a href={`/admin/finance/assets/runs/${r.id}`} onClick={(ev) => { ev.preventDefault(); navigate(`/admin/finance/assets/runs/${r.id}`); }}>{periodLabel(r.period)}</a>
                  </TableCell>
                  <TableCell><Badge variant={r.status === "draft" ? "outline" : r.status === "posted" ? "default" : "secondary"}>{RUN_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell>{day(r.approved_at)}</TableCell>
                  <TableCell>{r.journal_ref ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>New depreciation run</DialogTitle></DialogHeader>
          <form id="new-depreciation-run" onSubmit={handleCreate}>
            <Field label="Month" htmlFor="period">
              <Input id="period" name="period" type="month" required min={FIRST_PERIOD} defaultValue={nextPeriod(runs[0]?.period)} className={fieldInputClass} />
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" form="new-depreciation-run" disabled={createRun.isPending}>Calculate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepreciationRunsPage;
