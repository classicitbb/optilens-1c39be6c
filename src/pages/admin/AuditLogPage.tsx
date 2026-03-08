import { useState } from "react";
import { useAuditLogQuery, AuditLogEntry } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search, ClipboardList } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { format } from "date-fns";

const TABS = [
  { key: "", label: "All" },
  { key: "supplies", label: "Supplies" },
  { key: "lenses", label: "Lenses" },
  { key: "addons", label: "Add-Ons" },
  { key: "company_settings,pricing_settings", label: "Settings" },
  { key: "suppliers,brands,materials,mftypes,lenstypes,lens_options,finishtypes", label: "Reference Data" },
  { key: "pricelist_versions,pricelist_export", label: "Pricing Edits" },
];

const ACTION_COLORS: Record<string, string> = {
  create: "bg-[hsl(var(--admin-success)/0.15)] text-[hsl(var(--admin-success))]",
  update: "bg-[hsl(var(--admin-accent)/0.15)] text-[hsl(var(--admin-accent))]",
  delete: "bg-[hsl(var(--admin-destructive)/0.15)] text-[hsl(var(--admin-destructive))]",
};

interface AuditLogPageProps {
  embedded?: boolean;
}

const AuditLogPage = ({ embedded = false }: AuditLogPageProps) => {
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);

  const tableFilter = activeTab.includes(",") ? undefined : (activeTab || undefined);
  const tableNamesFilter = activeTab.includes(",") ? activeTab.split(",") : undefined;

  const { data: entries, isLoading } = useAuditLogQuery({
    table_name: tableFilter,
    table_names: tableNamesFilter,
    limit,
  });

  const filtered = (entries ?? []).filter((e) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesName =
        e.new_data?.name?.toLowerCase()?.includes(q) ||
        e.old_data?.name?.toLowerCase()?.includes(q) ||
        e.table_name.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q);
      if (!matchesName) return false;
    }
    return true;
  });

  return (
    <div className={embedded ? "space-y-4" : "p-4 space-y-4"}>
      {!embedded && <AdminPageHeader icon={ClipboardList} title="Audit Log" />}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-[hsl(var(--admin-table-border))]">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === t.key
                ? "text-[hsl(var(--admin-table-fg))]"
                : "text-[hsl(var(--admin-muted-fg))]"
            }`}
          >
            {t.label}
            {activeTab === t.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--admin-accent))]" />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[hsl(var(--admin-muted-fg))]" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, table…" className="h-8 text-xs pl-8" />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--admin-accent))] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-[hsl(var(--admin-muted-fg))] py-8 text-center">No audit log entries found.</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
          {(entries?.length ?? 0) >= limit && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setLimit((l) => l + 100)}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AuditRow = ({ entry }: { entry: AuditLogEntry }) => {
  const [expanded, setExpanded] = useState(false);
  const recordName = entry.new_data?.name || entry.old_data?.name || entry.record_id.slice(0, 8);

  return (
    <div className="rounded border text-xs border-[hsl(var(--admin-table-border))] bg-[hsl(var(--admin-table-surface))]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[hsl(var(--admin-table-row-alt))] transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />}
        <span className="text-[10px] text-[hsl(var(--admin-muted-fg))] w-32 shrink-0">
          {format(new Date(entry.created_at), "yyyy-MM-dd HH:mm")}
        </span>
        <Badge className={`text-[10px] px-1.5 py-0 ${ACTION_COLORS[entry.action] ?? ""}`}>
          {entry.action}
        </Badge>
        <span className="text-[hsl(var(--admin-muted-fg))] w-24 shrink-0 capitalize">{entry.table_name}</span>
        <span className="flex-1 truncate font-medium text-[hsl(var(--admin-table-fg))]">{recordName}</span>
        {entry.reason && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
            {entry.reason}
          </Badge>
        )}
        {entry.change_summary && Object.keys(entry.change_summary).length > 0 && (
          <span className="text-[hsl(var(--admin-muted-fg))] shrink-0">
            {Object.entries(entry.change_summary)
              .filter(([k]) => k !== "margin_delta")
              .map(([k, v]: [string, any]) => `${k}: ${v?.old ?? "—"} → ${v?.new ?? "—"}`)
              .join(", ")}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[hsl(var(--admin-table-border))] space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-semibold text-[hsl(var(--admin-muted-fg))] mb-1">Before</p>
              <pre className="text-[10px] bg-[hsl(var(--admin-table-row-alt))] p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap text-[hsl(var(--admin-table-fg))]">
                {entry.old_data ? JSON.stringify(entry.old_data, null, 2) : "—"}
              </pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-[hsl(var(--admin-muted-fg))] mb-1">After</p>
              <pre className="text-[10px] bg-[hsl(var(--admin-table-row-alt))] p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap text-[hsl(var(--admin-table-fg))]">
                {entry.new_data ? JSON.stringify(entry.new_data, null, 2) : "—"}
              </pre>
            </div>
          </div>
          <p className="text-[10px] text-[hsl(var(--admin-muted-fg))]">User: {entry.user_id.slice(0, 8)}… | ID: {entry.record_id.slice(0, 8)}…</p>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
