import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TicketPriority = "low" | "medium" | "high";
type TicketStatus = "open" | "in_progress" | "resolved";

interface HelpdeskTicket {
  id: string;
  subject: string;
  requester: string;
  team: string;
  priority: TicketPriority;
  status: TicketStatus;
  updatedAt: string;
}

const TICKETS: HelpdeskTicket[] = [
  {
    id: "TCK-9012",
    subject: "RX order unable to sync with ERP",
    requester: "Vision Plus",
    team: "Escalations",
    priority: "high",
    status: "in_progress",
    updatedAt: "2026-02-28T10:15:00.000Z",
  },
  {
    id: "TCK-9008",
    subject: "Store login reset request",
    requester: "OptiCare Midtown",
    team: "Tier 1 Support",
    priority: "medium",
    status: "open",
    updatedAt: "2026-02-27T14:05:00.000Z",
  },
  {
    id: "TCK-8999",
    subject: "Lens coating defect complaint",
    requester: "City Optics",
    team: "Quality Assurance",
    priority: "high",
    status: "resolved",
    updatedAt: "2026-02-26T08:22:00.000Z",
  },
];

const HelpdeskTicketsPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["helpdesk", "tickets"],
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return TICKETS;
    },
  });

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return data.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        ticket.id.toLowerCase().includes(normalizedSearch) ||
        ticket.subject.toLowerCase().includes(normalizedSearch) ||
        ticket.requester.toLowerCase().includes(normalizedSearch) ||
        ticket.team.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [data, search, statusFilter]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Helpdesk Tickets" icon={Ticket}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by ticket, subject, requester, team"
            className="h-8 w-72 text-xs"
          />
          <Select value={statusFilter} onValueChange={(value: "all" | TicketStatus) => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="open" className="text-xs">Open</SelectItem>
              <SelectItem value="in_progress" className="text-xs">In Progress</SelectItem>
              <SelectItem value="resolved" className="text-xs">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Queue
            <Badge variant="outline">{filteredTickets.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-xs text-muted-foreground">Loading tickets…</p> : null}

          {isError ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load tickets. {(error as Error)?.message ?? "Please retry."}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : null}

          {!isLoading && !isError && filteredTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tickets match your current filters.</p>
          ) : null}

          {!isLoading && !isError && filteredTickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">{ticket.id}</TableCell>
                    <TableCell>{ticket.subject}</TableCell>
                    <TableCell>{ticket.requester}</TableCell>
                    <TableCell>{ticket.team}</TableCell>
                    <TableCell className="capitalize">{ticket.priority.replace("_", " ")}</TableCell>
                    <TableCell className="capitalize">{ticket.status.replace("_", " ")}</TableCell>
                    <TableCell>{new Date(ticket.updatedAt).toLocaleString()}</TableCell>
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

export default HelpdeskTicketsPage;
