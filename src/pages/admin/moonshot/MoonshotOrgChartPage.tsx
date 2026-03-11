import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";
import type { OrgChartSeat, VacancyStatus } from "@/features/admin/moonshot/lib/types";

type Orientation = "vertical" | "horizontal";

const vacancyLabel: Record<VacancyStatus, string> = {
  filled: "Filled",
  vacant: "Vacant",
  "actively-hiring": "Actively hiring",
  planned: "Planned",
};

type SeatNodeProps = {
  seat: OrgChartSeat;
  byId: Map<string, OrgChartSeat>;
  users: ReturnType<typeof useMoonshotStore.getState>["users"];
  collapsed: Set<string>;
  expandedLevel: number;
  depth: number;
  orientation: Orientation;
  onToggleCollapse: (id: string) => void;
  onAssign: (seatId: string, userId: string | null) => void;
  onSetVacancy: (seatId: string, status: VacancyStatus) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (seat: OrgChartSeat) => void;
  onDelete: (id: string) => void;
};

function SeatNode({
  seat, byId, users, collapsed, expandedLevel, depth, orientation,
  onToggleCollapse, onAssign, onSetVacancy, onAddChild, onEdit, onDelete,
}: SeatNodeProps) {
  const assignedUsers = users.filter((u) => seat.assignedUserIds.includes(u.id));
  const children = seat.childIds.map((id) => byId.get(id)).filter(Boolean) as OrgChartSeat[];
  const hiddenByLevel = depth >= expandedLevel;
  const isCollapsed = collapsed.has(seat.id) || hiddenByLevel;
  const vacancyStatus = seat.vacancyStatus ?? (assignedUsers.length > 0 ? "filled" : "vacant");

  return (
    <div className={orientation === "vertical" ? "flex flex-col items-center" : "flex items-center gap-4"}>
      <Card className="w-full max-w-[290px]">
        <CardHeader className="space-y-2 pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">{seat.title}</CardTitle>
            <Badge variant="secondary">{seat.department}</Badge>
          </div>
          <div className="flex flex-wrap gap-1">
            {assignedUsers.length > 0 ? assignedUsers.map((user) => (
              <Badge key={user.id} variant="outline" className="text-xs">{user.name}</Badge>
            )) : <Badge variant="destructive" className="text-xs">No assignee</Badge>}
            <Badge variant={vacancyStatus === "filled" ? "secondary" : "outline"} className="text-xs">{vacancyLabel[vacancyStatus]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Select value={seat.assignedUserIds[0] ?? "unassigned"} onValueChange={(value) => onAssign(seat.id, value === "unassigned" ? null : value)}>
            <SelectTrigger><SelectValue placeholder="Assign user" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={vacancyStatus} onValueChange={(value) => onSetVacancy(seat.id, value as VacancyStatus)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(vacancyLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(seat)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => onAddChild(seat.id)}>Add child</Button>
            <Button size="sm" variant="outline" onClick={() => onToggleCollapse(seat.id)} disabled={children.length === 0}>{isCollapsed ? "Expand" : "Collapse"}</Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(seat.id)}>Remove</Button>
          </div>
        </CardContent>
      </Card>

      {children.length > 0 && !isCollapsed && (
        <div className={orientation === "vertical" ? "mt-4 flex flex-col items-center" : "ml-4 flex items-center"}>
          <div className={orientation === "vertical" ? "h-5 w-px bg-border" : "h-px w-5 bg-border"} />
          <div className={orientation === "vertical" ? "flex flex-wrap justify-center gap-5" : "flex flex-col gap-5"}>
            {children.map((child) => (
              <SeatNode
                key={child.id}
                seat={child}
                byId={byId}
                users={users}
                collapsed={collapsed}
                expandedLevel={expandedLevel}
                depth={depth + 1}
                orientation={orientation}
                onToggleCollapse={onToggleCollapse}
                onAssign={onAssign}
                onSetVacancy={onSetVacancy}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MoonshotOrgChartPage() {
  const { orgChart, users, addOrgSeat, assignUserToSeat, deleteOrgSeat, updateOrgSeat } = useMoonshotStore();
  const [zoom, setZoom] = useState(1);
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [expandedLevel, setExpandedLevel] = useState(10);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newRootTitle, setNewRootTitle] = useState("");
  const [newRootDepartment, setNewRootDepartment] = useState("Leadership");

  const byId = useMemo(() => new Map(orgChart.seats.map((seat) => [seat.id, seat])), [orgChart.seats]);
  const roots = orgChart.seats.filter((seat) => !seat.parentId);

  const onToggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onAddChild = (parentId: string | null) => {
    const title = window.prompt("Seat title", "New Seat");
    if (!title) return;
    const department = window.prompt("Department", "Operations") ?? "Operations";
    addOrgSeat(parentId, { title, department });
  };

  const onEdit = (seat: OrgChartSeat) => {
    const title = window.prompt("Edit seat title", seat.title);
    if (!title) return;
    const department = window.prompt("Edit department", seat.department);
    if (!department) return;
    updateOrgSeat(seat.id, { title, department });
  };

  const onDelete = (id: string) => {
    if (!window.confirm("Remove this seat and all child seats?")) return;
    deleteOrgSeat(id);
  };

  const onAddRootSeat = () => {
    if (!newRootTitle.trim()) return;
    addOrgSeat(null, { title: newRootTitle.trim(), department: newRootDepartment.trim() || "General" });
    setNewRootTitle("");
    setNewRootDepartment("General");
  };

  const onSetVacancy = (seatId: string, status: VacancyStatus) => updateOrgSeat(seatId, { vacancyStatus: status });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Org Chart Controls</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}>Zoom out</Button>
          <Button variant="outline" onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}>Zoom in</Button>
          <Button variant="outline" onClick={() => setOrientation((o) => (o === "vertical" ? "horizontal" : "vertical"))}>Orientation: {orientation}</Button>
          <Button variant="outline" onClick={() => setExpandedLevel((l) => Math.max(1, l - 1))}>Collapse level</Button>
          <Button variant="outline" onClick={() => setExpandedLevel((l) => Math.min(10, l + 1))}>Expand level</Button>
          <Button variant="secondary" onClick={() => window.print()}>Print / export view</Button>
          <Button variant="secondary" onClick={() => { setZoom(1); setOrientation("vertical"); setExpandedLevel(10); setCollapsed(new Set()); }}>Fit screen</Button>
          <div className="ml-auto text-sm text-muted-foreground">Zoom {Math.round(zoom * 100)}%</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tool links & help</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild size="sm" variant="outline"><Link to="/admin/moonshot/tools/one-on-ones">Go to One-on-Ones</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/admin/moonshot/tools/right-person-right-seat">Go to Right Person Right Seat</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/moonshot/resources">Open help resources</Link></Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add root seat</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input placeholder="Seat title" value={newRootTitle} onChange={(e) => setNewRootTitle(e.target.value)} className="max-w-xs" />
          <Input placeholder="Department" value={newRootDepartment} onChange={(e) => setNewRootDepartment(e.target.value)} className="max-w-xs" />
          <Button onClick={onAddRootSeat}>Add seat</Button>
        </CardContent>
      </Card>

      <div className="overflow-auto rounded-lg border bg-card p-6">
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}>
          <div className={orientation === "vertical" ? "space-y-8" : "space-y-6"}>
            {roots.map((root) => (
              <SeatNode
                key={root.id}
                seat={root}
                byId={byId}
                users={users}
                collapsed={collapsed}
                expandedLevel={expandedLevel}
                depth={0}
                orientation={orientation}
                onToggleCollapse={onToggleCollapse}
                onAssign={(seatId, userId) => assignUserToSeat(seatId, userId)}
                onSetVacancy={onSetVacancy}
                onAddChild={onAddChild}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
