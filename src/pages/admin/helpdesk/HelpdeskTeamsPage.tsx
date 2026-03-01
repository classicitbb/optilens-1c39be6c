import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TeamAvailability = "active" | "on_call" | "offline";

interface HelpdeskTeam {
  id: string;
  name: string;
  lead: string;
  availability: TeamAvailability;
  backlog: number;
  avgResolutionHours: number;
}

const TEAMS: HelpdeskTeam[] = [
  { id: "TEAM-01", name: "Tier 1 Support", lead: "Rina Patel", availability: "active", backlog: 18, avgResolutionHours: 3.5 },
  { id: "TEAM-02", name: "Escalations", lead: "Miguel Santos", availability: "on_call", backlog: 7, avgResolutionHours: 7.2 },
  { id: "TEAM-03", name: "Quality Assurance", lead: "Noa Kim", availability: "active", backlog: 5, avgResolutionHours: 6.1 },
  { id: "TEAM-04", name: "Weekend Coverage", lead: "Aya Hassan", availability: "offline", backlog: 0, avgResolutionHours: 0 },
];

const HelpdeskTeamsPage = () => {
  const [search, setSearch] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | TeamAvailability>("all");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["helpdesk", "teams"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return TEAMS;
    },
  });

  const filteredTeams = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.filter((team) => {
      const matchesAvailability = availabilityFilter === "all" || team.availability === availabilityFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        team.id.toLowerCase().includes(normalizedSearch) ||
        team.name.toLowerCase().includes(normalizedSearch) ||
        team.lead.toLowerCase().includes(normalizedSearch);

      return matchesAvailability && matchesSearch;
    });
  }, [data, search, availabilityFilter]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Helpdesk Teams" icon={UsersRound}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by team, lead, or ID"
            className="h-8 w-64 text-xs"
          />
          <Select value={availabilityFilter} onValueChange={(value: "all" | TeamAvailability) => setAvailabilityFilter(value)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Filter by availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="on_call" className="text-xs">On Call</SelectItem>
              <SelectItem value="offline" className="text-xs">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Team Capacity
            <Badge variant="outline">{filteredTeams.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-xs text-muted-foreground">Loading teams…</p> : null}

          {isError ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load teams. {(error as Error)?.message ?? "Please retry."}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : null}

          {!isLoading && !isError && filteredTeams.length === 0 ? (
            <p className="text-xs text-muted-foreground">No teams match your current filters.</p>
          ) : null}

          {!isLoading && !isError && filteredTeams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team ID</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Availability</TableHead>
                  <TableHead>Open Backlog</TableHead>
                  <TableHead>Avg Resolution (hrs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-mono text-xs">{team.id}</TableCell>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>{team.lead}</TableCell>
                    <TableCell className="capitalize">{team.availability.replace("_", " ")}</TableCell>
                    <TableCell>{team.backlog}</TableCell>
                    <TableCell>{team.avgResolutionHours.toFixed(1)}</TableCell>
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

export default HelpdeskTeamsPage;
