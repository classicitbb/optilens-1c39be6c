import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Field, fieldInputClass, formValues } from "./formFields";
import { NativeSelect } from "./formBits";
import { buildPositionTree, type PositionItem, type TreeNode } from "./orgTree";
import { employeeDisplayName, useHrMutation, type Employee } from "./useEmployees";
import { openHrDocument, removeHrDocument, uploadHrDocument, type EmployeePosition, type Position } from "./usePositions";

interface PositionsPanelProps {
  positions: Position[];
  assignments: EmployeePosition[];
  employees: Employee[];
  departments: string[];
}

const flatten = (nodes: TreeNode<PositionItem>[]): PositionItem[] => nodes.flatMap((n) => [n.item, ...flatten(n.reports)]);

/** Every position below `id`, so a position cannot be made to report to its own reports. */
const descendantIds = (nodes: TreeNode<PositionItem>[], id: string): Set<string> => {
  const root = flatten(nodes).length ? findNode(nodes, id) : undefined;
  return new Set(root ? flatten(root.reports).map((i) => i.position.id) : []);
};

const findNode = (nodes: TreeNode<PositionItem>[], id: string): TreeNode<PositionItem> | undefined => {
  for (const n of nodes) {
    const hit = n.item.position.id === id ? n : findNode(n.reports, id);
    if (hit) return hit;
  }
  return undefined;
};

const FILE_ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";

const PositionsPanel = ({ positions, assignments, employees, departments }: PositionsPanelProps) => {
  const { toast } = useToast();
  const mutate = useHrMutation("positions");
  const [editing, setEditing] = useState<Position | "new" | null>(null);
  const [saving, setSaving] = useState(false);

  const tree = useMemo(() => buildPositionTree(positions, assignments, employees), [positions, assignments, employees]);
  const holders = useMemo(() => new Map(flatten(tree).map((i) => [i.position.id, i.holders])), [tree]);
  const positionName = (id: string | null) => {
    const p = id ? positions.find((x) => x.id === id) : null;
    return p ? `${p.title} · ${p.department}` : "—";
  };

  const parentOptions = (editingId: string | null): Record<string, string> => {
    const blocked = editingId ? new Set([editingId, ...descendantIds(tree, editingId)]) : new Set<string>();
    return {
      "": "— None (top of the company) —",
      ...Object.fromEntries(positions.filter((p) => !blocked.has(p.id)).map((p) => [p.id, `${p.title} · ${p.department}`])),
    };
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const v = formValues(form);
    const file = data.get("file") as File | null;
    const values = {
      title: v.title,
      department: v.department,
      reports_to_position_id: v.reports_to_position_id,
      headcount: Number(v.headcount ?? 1),
      active: data.has("active"),
      job_description: v.job_description,
    };
    const previousPath = editing && editing !== "new" ? editing.job_description_path : null;
    setSaving(true);
    try {
      const saved = (await mutate.mutateAsync(editing && editing !== "new" ? { update: { id: editing.id, values } } : { insert: values })) as Position;
      if (file && file.size > 0) {
        const path = await uploadHrDocument(`job-descriptions/${saved.id}`, file);
        await mutate.mutateAsync({ update: { id: saved.id, values: { job_description_path: path, job_description_file_name: file.name } } });
        if (previousPath) await removeHrDocument(previousPath).catch(() => undefined);
      }
      setEditing(null);
    } catch (error) {
      toast({ title: "Could not save position", description: (error as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const current = editing && editing !== "new" ? editing : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Positions are the seats in the company. People can hold more than one.</p>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> Add position</Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Position</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Reports to</TableHead>
              <TableHead>Held by</TableHead>
              <TableHead>Job description</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No positions yet. Add the first one, usually the top of the company.</TableCell></TableRow>
            ) : (
              positions.map((p) => {
                const held = holders.get(p.id) ?? [];
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setEditing(p)}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{positionName(p.reports_to_position_id)}</TableCell>
                    <TableCell>
                      {held.length ? held.map(employeeDisplayName).join(", ") : <span className="text-muted-foreground">Vacant</span>}
                      {p.headcount > 1 && <span className="ml-1 text-xs text-muted-foreground">({held.length}/{p.headcount})</span>}
                    </TableCell>
                    <TableCell>{p.job_description || p.job_description_path ? "Yes" : "—"}</TableCell>
                    <TableCell><Badge variant={p.active ? "default" : "outline"}>{p.active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{current ? "Edit position" : "Add position"}</DialogTitle></DialogHeader>
          <form id="position-form" key={current?.id ?? "new"} onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Title" htmlFor="title"><Input id="title" name="title" required defaultValue={current?.title} className={fieldInputClass} /></Field>
            <Field label="Department" htmlFor="department"><Input id="department" name="department" required list="position-departments" defaultValue={current?.department} className={fieldInputClass} /></Field>
            <datalist id="position-departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
            <Field label="Reports to" htmlFor="reports_to_position_id" className="sm:col-span-2">
              <NativeSelect id="reports_to_position_id" name="reports_to_position_id" defaultValue={current?.reports_to_position_id} options={parentOptions(current?.id ?? null)} />
            </Field>
            <Field label="Seats" htmlFor="headcount"><Input id="headcount" name="headcount" type="number" min="1" step="1" defaultValue={current?.headcount ?? 1} className={fieldInputClass} /></Field>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Active position</label>
            <Field label="Job description" htmlFor="job_description" className="sm:col-span-2"><Textarea id="job_description" name="job_description" rows={6} defaultValue={current?.job_description ?? ""} /></Field>
            <Field label={current?.job_description_path ? "Replace job description file" : "Job description file (PDF, Word, up to 20 MB)"} htmlFor="file" className="sm:col-span-2">
              <Input id="file" name="file" type="file" accept={FILE_ACCEPT} />
              {current?.job_description_path && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openHrDocument(current.job_description_path!)}>
                  Open {current.job_description_file_name ?? "current file"}
                </Button>
              )}
            </Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="position-form" disabled={saving}>Save position</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PositionsPanel;
