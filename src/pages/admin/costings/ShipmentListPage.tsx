import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useShipments, Shipment } from "@/hooks/useShipments";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Copy } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  typeFilter?: "lens" | "non-lens";
  title: string;
}

const statusColor: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reviewed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  locked: "bg-green-500/20 text-green-300 border-green-500/30",
};

const ShipmentListPage = ({ typeFilter, title }: Props) => {
  const { data: shipments = [], isLoading, createMutation, deleteMutation } = useShipments(typeFilter);
  const { canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canEdit = canEditFeature("costings");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return shipments.filter((sh) =>
      !s ||
      sh.invoice_number.toLowerCase().includes(s) ||
      sh.po_ref.toLowerCase().includes(s) ||
      (sh.supplier_name ?? "").toLowerCase().includes(s) ||
      sh.commodity.toLowerCase().includes(s)
    );
  }, [shipments, search]);

  const handleCreate = () => {
    // Navigate to new shipment form — no DB insert until user saves
    const typePath = typeFilter === "lens" ? "?type=lens" : typeFilter === "non-lens" ? "?type=non-lens" : "";
    navigate(`/admin/pricing/costings/new${typePath}`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      logChange({ table_name: "shipments", record_id: deleteTarget.id, action: "delete", old_data: deleteTarget as any });
      toast({ title: "Deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setDeleteTarget(null);
  };

  const handleClone = async (sh: Shipment) => {
    try {
      const { id, created_at, updated_at, supplier_name, ...rest } = sh;
      const res = await createMutation.mutateAsync({
        ...rest,
        status: "draft",
        version: sh.version + 1,
        parent_id: sh.id,
      } as any);
      logChange({ table_name: "shipments", record_id: res.id, action: "create", new_data: { ...res, revision_of: sh.id } });
      toast({ title: "Revision created" });
      navigate(`/admin/pricing/costings/${res.id}`);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>{title}</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search shipments…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs w-56"
            />
          </div>
          {canEdit && (
            <Button size="sm" className="h-8 text-xs gap-1" onClick={handleCreate}>
              <Plus className="h-3.5 w-3.5" /> New Shipment
            </Button>
          )}
        </div>
      </div>

      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-8">Invoice #</TableHead>
              <TableHead className="h-8">Type</TableHead>
              <TableHead className="h-8">Supplier</TableHead>
              <TableHead className="h-8">PO Ref</TableHead>
              <TableHead className="h-8">Date Received</TableHead>
              <TableHead className="h-8 text-right">FOB ({typeFilter ? "USD" : "FX"})</TableHead>
              <TableHead className="h-8 text-right">Invoice ({typeFilter ? "USD" : "FX"})</TableHead>
              <TableHead className="h-8">Status</TableHead>
              <TableHead className="h-8">V</TableHead>
              {canEdit && <TableHead className="h-8 w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={10} className="text-center text-xs py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center text-xs py-8 text-muted-foreground">No shipments found</TableCell></TableRow>
            ) : (
              filtered.map((sh) => (
                <TableRow
                  key={sh.id}
                  className="cursor-pointer hover:bg-muted/50 text-xs"
                  onClick={() => navigate(`/admin/pricing/costings/${sh.id}`)}
                >
                  <TableCell className="py-1.5 font-medium">{sh.invoice_number || "—"}</TableCell>
                  <TableCell className="py-1.5 capitalize">{sh.type}</TableCell>
                  <TableCell className="py-1.5">{sh.supplier_name || "—"}</TableCell>
                  <TableCell className="py-1.5">{sh.po_ref || "—"}</TableCell>
                  <TableCell className="py-1.5">{sh.date_received}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono">{fmt(sh.fob_foreign)}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono">{fmt(sh.invoice_total_foreign)}</TableCell>
                  <TableCell className="py-1.5">
                    <Badge variant="outline" className={`text-[10px] ${statusColor[sh.status] || ""}`}>{sh.status}</Badge>
                  </TableCell>
                  <TableCell className="py-1.5">v{sh.version}</TableCell>
                  {canEdit && (
                    <TableCell className="py-1.5">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {sh.status === "locked" && isAdmin && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" title="Create Revision" onClick={() => handleClone(sh)}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {isAdmin && sh.status !== "locked" && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Delete" onClick={() => setDeleteTarget(sh)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shipment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete shipment "{deleteTarget?.invoice_number}" and all its charges and line items.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ShipmentListPage;
