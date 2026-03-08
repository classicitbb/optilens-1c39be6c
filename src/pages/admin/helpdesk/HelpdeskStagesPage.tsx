import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useCreateHelpdeskStage, useUpdateHelpdeskStage, useDeleteHelpdeskStage } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";

interface HelpdeskStage {
  id: string;
  name: string;
  sequence: number;
  is_closed: boolean;
  is_folded: boolean;
  created_at: string;
}

const HelpdeskStagesPage = () => {
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewStages = canView("helpdesk");
  const canEditStages = canEditFeature("helpdesk");

  const [form, setForm] = useState({ name: "", sequence: "10" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", sequence: "" });

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["helpdesk", "stages", "all"],
    enabled: canViewStages,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_stages")
        .select("id,name,sequence,is_closed,is_folded,created_at")
        .order("sequence");
      if (error) throw error;
      return (data ?? []) as HelpdeskStage[];
    },
  });

  const createStage = useCreateHelpdeskStage();
  const updateStage = useUpdateHelpdeskStage();
  const deleteStage = useDeleteHelpdeskStage();

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createStage.mutate({ name: form.name.trim(), sequence: Number(form.sequence) || 10 });
    setForm({ name: "", sequence: "10" });
  };

  const startEdit = (stage: HelpdeskStage) => {
    setEditingId(stage.id);
    setEditForm({ name: stage.name, sequence: String(stage.sequence) });
  };

  const saveEdit = (id: string) => {
    updateStage.mutate({ id, name: editForm.name.trim(), sequence: Number(editForm.sequence) });
    setEditingId(null);
  };

  if (!canViewStages) {
    return <p className="text-sm text-muted-foreground">You do not have access to Helpdesk stages.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Ticket Stages" icon={Layers} />

      {canEditStages && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Create Stage</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Stage name" className="h-8 text-xs md:col-span-2" />
            <Input value={form.sequence} onChange={(e) => setForm((p) => ({ ...p, sequence: e.target.value }))} placeholder="Sequence" type="number" className="h-8 text-xs" />
            <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={createStage.isPending}>Create Stage</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Stage Pipeline
            <Badge variant="outline">{stages.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Loading stages…</p>}
          {!isLoading && stages.length === 0 && <p className="text-xs text-muted-foreground">No stages configured.</p>}
          {!isLoading && stages.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seq</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Closed</TableHead>
                  <TableHead>Folded</TableHead>
                  {canEditStages && <TableHead className="w-48">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map((stage) => (
                  <TableRow key={stage.id}>
                    <TableCell>
                      {editingId === stage.id ? (
                        <Input value={editForm.sequence} onChange={(e) => setEditForm((p) => ({ ...p, sequence: e.target.value }))} className="h-7 w-16 text-xs" type="number" />
                      ) : stage.sequence}
                    </TableCell>
                    <TableCell>
                      {editingId === stage.id ? (
                        <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="h-7 text-xs" />
                      ) : stage.name}
                    </TableCell>
                    <TableCell>
                      {canEditStages ? (
                        <Switch checked={stage.is_closed} onCheckedChange={(v) => updateStage.mutate({ id: stage.id, is_closed: v })} />
                      ) : (stage.is_closed ? "Yes" : "No")}
                    </TableCell>
                    <TableCell>
                      {canEditStages ? (
                        <Switch checked={stage.is_folded} onCheckedChange={(v) => updateStage.mutate({ id: stage.id, is_folded: v })} />
                      ) : (stage.is_folded ? "Yes" : "No")}
                    </TableCell>
                    {canEditStages && (
                      <TableCell className="flex gap-1">
                        {editingId === stage.id ? (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveEdit(stage.id)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(stage)}>Edit</Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete stage "{stage.name}"?</AlertDialogTitle>
                                    <AlertDialogDescription>Tickets in this stage will become unstaged. This cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteStage.mutate(stage.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpdeskStagesPage;
