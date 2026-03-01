import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type PolicyStatus = "active" | "draft" | "paused";

type PolicyPriority = "low" | "medium" | "high" | "critical";

interface SlaPolicy {
  id: string;
  name: string;
  priority: PolicyPriority;
  firstResponseMinutes: number;
  resolutionHours: number;
  status: PolicyStatus;
}

const SLA_POLICIES: SlaPolicy[] = [
  { id: "SLA-PRIORITY", name: "Priority Accounts", priority: "critical", firstResponseMinutes: 15, resolutionHours: 4, status: "active" },
  { id: "SLA-STANDARD", name: "Standard Retail Coverage", priority: "medium", firstResponseMinutes: 60, resolutionHours: 24, status: "active" },
  { id: "SLA-LOW", name: "Backoffice Requests", priority: "low", firstResponseMinutes: 240, resolutionHours: 72, status: "draft" },
  { id: "SLA-QA", name: "QA Escalations", priority: "high", firstResponseMinutes: 30, resolutionHours: 8, status: "paused" },
];

const HelpdeskSlaPoliciesPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PolicyStatus>("all");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["helpdesk", "sla-policies"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return SLA_POLICIES;
    },
  });

  const filteredPolicies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.filter((policy) => {
      const matchesStatus = statusFilter === "all" || policy.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        policy.id.toLowerCase().includes(normalizedSearch) ||
        policy.name.toLowerCase().includes(normalizedSearch) ||
        policy.priority.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="SLA Policies" icon={ShieldCheck}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by policy, priority, or ID"
            className="h-8 w-64 text-xs"
          />
          <Select value={statusFilter} onValueChange={(value: "all" | PolicyStatus) => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="paused" className="text-xs">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Policy Definitions
            <Badge variant="outline">{filteredPolicies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-xs text-muted-foreground">Loading SLA policies…</p> : null}

          {isError ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load SLA policies. {(error as Error)?.message ?? "Please retry."}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : null}

          {!isLoading && !isError && filteredPolicies.length === 0 ? (
            <p className="text-xs text-muted-foreground">No SLA policies match your current filters.</p>
          ) : null}

          {!isLoading && !isError && filteredPolicies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>First Response</TableHead>
                  <TableHead>Resolution Target</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-mono text-xs">{policy.id}</TableCell>
                    <TableCell>{policy.name}</TableCell>
                    <TableCell className="capitalize">{policy.priority}</TableCell>
                    <TableCell>{policy.firstResponseMinutes} min</TableCell>
                    <TableCell>{policy.resolutionHours} hr</TableCell>
                    <TableCell className="capitalize">{policy.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpdeskSlaPoliciesPage;
