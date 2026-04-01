import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShipments, useAllShipmentCharges, Shipment } from "@/hooks/useShipments";
import { useShipmentTypes } from "@/hooks/useImportCostingRefs";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Trash2, Copy, Ship, ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { computeShipmentDerivedTotals, formatMoney } from "@/lib/importCostings";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  reviewed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  locked: "bg-green-500/20 text-green-300 border-green-500/30",
};

type SortKey = "type" | "supplier" | "date_received" | "fob_foreign" | "total_landed_bbd" | "status";
type SortDirection = "asc" | "desc";

type ShipmentRow = Shipment & {
  totalLandedBbd: number;
  totalChargesBbd: number;
};

const fmt = formatMoney;

const ShipmentsTab = () => {
  const { data: shipments = [], isLoading, createMutation, deleteMutation } = useShipments();
  const { data: allCharges = [] } = useAllShipmentCharges();
  const { data: shipmentTypes = [] } = useShipmentTypes();
  const { settings } = usePricingEngine();
  const { canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canEdit = canEditFeature("costings");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Shipment | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date_received");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const chargesByShipment = useMemo(() => {
    return allCharges.reduce<Record<string, typeof allCharges>>((acc, charge) => {
      const shipmentId = charge.shipment_id;
      if (!shipmentId) return acc;
      acc[shipmentId] ??= [];
      acc[shipmentId].push(charge);
      return acc;
    }, {});
  }, [allCharges]);

  const shipmentsWithTotals = useMemo<ShipmentRow[]>(() => {
    return shipments.map((shipment) => {
      const totals = computeShipmentDerivedTotals(shipment, chargesByShipment[shipment.id] ?? [], settings);
      return {
        ...shipment,
        totalLandedBbd: totals.totalLandedBbd,
        totalChargesBbd: totals.totalChargesBbd,
      };
    });
  }, [chargesByShipment, settings, shipments]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    const base = shipmentsWithTotals.filter((sh) => {
      if (typeFilter !== "all" && sh.type !== typeFilter && sh.commodity !== typeFilter) return false;
      if (!s) return true;
      return (
        sh.invoice_number.toLowerCase().includes(s) ||
        (sh.po_ref || "").toLowerCase().includes(s) ||
        (sh.supplier_name ?? "").toLowerCase().includes(s) ||
        sh.commodity.toLowerCase().includes(s)
      );
    });

    return [...base].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: "base" }) * direction;
    });
  }, [search, shipmentsWithTotals, sortDirection, sortKey, typeFilter]);

  const totalsRow = useMemo(() => {
    return filtered.reduce(
      (acc, shipment) => {
        acc.fobForeign += shipment.fob_foreign || 0;
        acc.totalLandedBbd += shipment.totalLandedBbd || 0;
        return acc;
      },
      { fobForeign: 0, totalLandedBbd: 0 }
    );
  }, [filtered]);

  const activeShipmentTypes = shipmentTypes.filter(t => t.is_active);

  const handleCreate = () => {
    const typePath = typeFilter !== "all" ? `?type=${typeFilter}` : "";
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
        freight_provider: sh.freight_provider ?? "dhl",
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "date_received" ? "desc" : "asc");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          {[{ code: "all", name: "All" }, ...activeShipmentTypes].map((f) => (
            <button
              key={f.code}
              onClick={() => setTypeFilter(f.code)}
              className={`h-7 px-3 text-xs rounded font-medium transition-colors border ${
                typeFilter === f.code
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
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

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
        <div className="min-h-0 flex-1 overflow-auto">
          <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="sticky top-0 z-20 h-8 bg-background">Invoice #</TableHead>
              <SortableHead label="Type" sortKey="type" activeKey={sortKey} direction={sortDirection} onToggle={toggleSort} />
              <SortableHead label="Supplier" sortKey="supplier" activeKey={sortKey} direction={sortDirection} onToggle={toggleSort} />
              <TableHead className="sticky top-0 z-20 h-8 bg-background">PO Ref / AWB#</TableHead>
              <SortableHead label="Date Received" sortKey="date_received" activeKey={sortKey} direction={sortDirection} onToggle={toggleSort} />
              <SortableHead label="FOB (FX)" sortKey="fob_foreign" activeKey={sortKey} direction={sortDirection} onToggle={toggleSort} align="right" />
              <SortableHead label="Total Landed (BBD)" sortKey="total_landed_bbd" activeKey={sortKey} direction={sortDirection} onToggle={toggleSort} align="right" />
              <SortableHead label="Status" sortKey="status" activeKey={sortKey} direction={sortDirection} onToggle={toggleSort} />
              <TableHead className="sticky top-0 z-20 h-8 bg-background">V</TableHead>
              {canEdit && <TableHead className="sticky top-0 z-20 h-8 w-20 bg-background" />}
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
                  <TableCell className="py-1.5 text-right font-mono">{fmt(sh.totalLandedBbd)}</TableCell>
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
          <TableFooter className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <TableRow className="text-xs hover:bg-background/95">
              <TableCell className="py-2 font-semibold">Totals</TableCell>
              <TableCell colSpan={4} className="py-2 text-muted-foreground">
                {filtered.length} shipment{filtered.length === 1 ? "" : "s"} in current view
              </TableCell>
              <TableCell className="py-2 text-right font-mono">{fmt(totalsRow.fobForeign)}</TableCell>
              <TableCell className="py-2 text-right font-mono">{fmt(totalsRow.totalLandedBbd)}</TableCell>
              <TableCell colSpan={canEdit ? 3 : 2} className="py-2" />
            </TableRow>
          </TableFooter>
          </Table>
        </div>
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

const getSortValue = (shipment: ShipmentRow, key: SortKey) => {
  switch (key) {
    case "type":
      return shipment.type;
    case "supplier":
      return shipment.supplier_name || "";
    case "date_received":
      return shipment.date_received;
    case "fob_foreign":
      return shipment.fob_foreign || 0;
    case "total_landed_bbd":
      return shipment.totalLandedBbd || 0;
    case "status":
      return shipment.status;
    default:
      return "";
  }
};

const SortableHead = ({
  label,
  sortKey,
  activeKey,
  direction,
  onToggle,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  direction: SortDirection;
  onToggle: (key: SortKey) => void;
  align?: "left" | "right";
}) => {
  const active = activeKey === sortKey;
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={cn("sticky top-0 z-20 h-8 bg-background", align === "right" && "text-right")}>
      <button
        type="button"
        className={cn(
          "inline-flex w-full items-center gap-1 text-left text-muted-foreground hover:text-foreground",
          align === "right" && "justify-end"
        )}
        onClick={() => onToggle(sortKey)}
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5" />
      </button>
    </TableHead>
  );
};

const ImportCostingsPage = () => {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      <AdminPageHeader icon={Ship} title="Import Costings" />
      <ShipmentsTab />
    </div>
  );
};

export default ImportCostingsPage;
