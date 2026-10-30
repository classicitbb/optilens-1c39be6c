import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Building2, Plus } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { day, money } from "@/features/admin/hr/formFields";
import AssetFormDialog from "@/features/admin/finance/assets/AssetFormDialog";
import { AssetsNav } from "@/features/admin/finance/assets/AssetsRoute";
import { ASSET_STATUS_LABELS, nbv, useAssetClasses, useRegister, type RegisterAsset } from "@/features/admin/finance/assets/useAssets";

const selectClass = "h-9 rounded-md border border-input bg-background px-2 text-sm";
const total = (rows: RegisterAsset[], pick: (a: RegisterAsset) => number) => rows.reduce((s, a) => s + Math.round(pick(a) * 100), 0) / 100;

const AssetsPage = () => {
  const navigate = useNavigate();
  const { data: assets = [], isLoading, error } = useRegister();
  const { data: classes = [] } = useAssetClasses();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("held");

  const className = useMemo(() => new Map(classes.map((c) => [c.id, c.name])), [classes]);
  const held = assets.filter((a) => a.status === "in_service");
  const rows = assets.filter((a) => {
    if (status === "held" ? !["draft", "in_service"].includes(a.status) : status && a.status !== status) return false;
    if (classId && a.class_id !== classId) return false;
    const q = search.trim().toLowerCase();
    return !q || [a.tag, a.name, a.serial_no, a.location, a.legacy_qbo_account].some((v) => v?.toLowerCase().includes(q));
  });

  const summary = classes
    .map((c) => {
      const inClass = held.filter((a) => a.class_id === c.id);
      return { id: c.id, name: c.name, count: inClass.length, nbv: total(inClass, nbv) };
    })
    .filter((s) => s.count > 0);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={Building2} title="Fixed assets" tooltip="The fixed asset register: cost, depreciation to date and book value for everything the business owns.">
        <Button size="sm" onClick={() => setAdding(true)}><Plus className="mr-1 h-4 w-4" /> New asset</Button>
      </AdminPageHeader>
      <AssetsNav />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Book value, all assets in service</p>
            <p className="text-lg font-semibold tabular-nums">{money(total(held, nbv))}</p>
            <p className="text-xs text-muted-foreground">{held.length} assets · cost {money(total(held, (a) => a.cost))}</p>
          </CardContent>
        </Card>
        {summary.map((s) => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.name}</p>
              <p className="text-lg font-semibold tabular-nums">{money(s.nbv)}</p>
              <p className="text-xs text-muted-foreground">{s.count} assets</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input aria-label="Search assets" placeholder="Search tag, name, serial, location…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-64" />
        <select aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)} className={selectClass}>
          <option value="">All classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
          <option value="held">Draft and in service</option>
          <option value="">Everything</option>
          {Object.entries(ASSET_STATUS_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>In service</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Depreciation to date</TableHead>
              <TableHead className="text-right">Book value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={8} className="text-center text-destructive">Could not load assets: {(error as Error).message}</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">{assets.length ? "No assets match." : "No assets yet. Add one, or import the opening balances."}</TableCell></TableRow>
            ) : (
              rows.map((a) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => navigate(`/admin/finance/assets/${a.id}`)}>
                  <TableCell className="font-mono text-xs">{a.tag}</TableCell>
                  <TableCell className="font-medium">
                    <a href={`/admin/finance/assets/${a.id}`} onClick={(ev) => { ev.preventDefault(); navigate(`/admin/finance/assets/${a.id}`); }}>{a.name}</a>
                    {a.expense_target === "cogs" && <Badge variant="outline" className="ml-2 text-[10px]">COS</Badge>}
                  </TableCell>
                  <TableCell>{className.get(a.class_id)}</TableCell>
                  <TableCell>{day(a.in_service_on)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(a.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(a.book?.accum_dep ?? 0)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(nbv(a))}</TableCell>
                  <TableCell><Badge variant={a.status === "in_service" ? "secondary" : "outline"}>{ASSET_STATUS_LABELS[a.status]}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4}>{rows.length} shown</TableCell>
                <TableCell className="text-right tabular-nums">{money(total(rows, (a) => a.cost))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(total(rows, (a) => a.book?.accum_dep ?? 0))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(total(rows, nbv))}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {adding && <AssetFormDialog onClose={() => setAdding(false)} onSaved={(id) => navigate(`/admin/finance/assets/${id}`)} />}
    </div>
  );
};

export default AssetsPage;
