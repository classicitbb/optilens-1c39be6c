import { Smile, Frown, Meh, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

interface NpsSummaryRow {
  trigger_context: string;
  total_responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps_score: number | null;
}

interface NpsResponseRow {
  id: string;
  score: number;
  comment: string | null;
  trigger_context: string;
  source_label: string | null;
  contact_email: string | null;
  created_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  overall: "Overall",
  order: "Orders",
  helpdesk_ticket: "Support tickets",
  manual: "Manual",
  other: "Other",
};

const scoreBadgeVariant = (score: number) => (score >= 9 ? "default" : score >= 7 ? "secondary" : "destructive");

const NpsDashboardPage = () => {
  const { data: summary = [], isLoading: loadingSummary } = useQuery({
    queryKey: ["admin-nps-summary"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("nps_score_summary").select("*");
      if (error) throw error;
      return (data ?? []) as NpsSummaryRow[];
    },
  });

  const { data: responses = [], isLoading: loadingResponses } = useQuery({
    queryKey: ["admin-nps-responses"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("nps_responses")
        .select("id,score,comment,trigger_context,source_label,contact_email,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as NpsResponseRow[];
    },
  });

  const overall = summary.find((row) => row.trigger_context === "overall");
  const detractorResponses = responses.filter((r) => r.score <= 6);

  return (
    <div className="flex min-h-full flex-col gap-4 p-4 lg:p-6">
      <AdminPageHeader icon={Smile} title="Customer Feedback (NPS)">
        {overall && (
          <Badge variant="outline" className="gap-1.5">
            {overall.total_responses} response{overall.total_responses === 1 ? "" : "s"}
          </Badge>
        )}
      </AdminPageHeader>

      <p className="-mt-2 text-sm text-muted-foreground">
        Net Promoter Score from customers after they place an order or a support ticket is resolved.
        Promoters score 9–10, passives 7–8, detractors 0–6. NPS = %promoters − %detractors.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {loadingSummary ? "…" : overall?.nps_score ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Smile className="h-3.5 w-3.5" /> Promoters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loadingSummary ? "…" : overall?.promoters ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Meh className="h-3.5 w-3.5" /> Passives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loadingSummary ? "…" : overall?.passives ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Frown className="h-3.5 w-3.5" /> Detractors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{loadingSummary ? "…" : overall?.detractors ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">By trigger</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary
              .filter((row) => row.trigger_context !== "overall")
              .map((row) => (
                <div key={row.trigger_context} className="flex items-center justify-between text-sm">
                  <span>{TRIGGER_LABELS[row.trigger_context] ?? row.trigger_context}</span>
                  <span className="font-medium">
                    {row.nps_score ?? "—"} <span className="text-xs text-muted-foreground">({row.total_responses})</span>
                  </span>
                </div>
              ))}
            {!loadingSummary && summary.filter((row) => row.trigger_context !== "overall").length === 0 && (
              <p className="text-sm text-muted-foreground">No responses yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Recent detractors (follow up)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {detractorResponses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {loadingResponses ? "Loading…" : "No detractor responses — nice work."}
              </p>
            ) : (
              <ul className="space-y-2">
                {detractorResponses.slice(0, 8).map((r) => (
                  <li key={r.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <Badge variant={scoreBadgeVariant(r.score)}>{r.score}</Badge>
                      <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy")}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.source_label ?? TRIGGER_LABELS[r.trigger_context]} · {r.contact_email ?? "no email on file"}</p>
                    {r.comment && <p className="mt-1">{r.comment}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">All responses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "MMM d, yyyy h:mma")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={scoreBadgeVariant(r.score)}>{r.score}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.source_label ?? TRIGGER_LABELS[r.trigger_context] ?? r.trigger_context}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.contact_email ?? "—"}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-sm">{r.comment ?? "—"}</TableCell>
                </TableRow>
              ))}
              {!loadingResponses && responses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No NPS responses yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default NpsDashboardPage;
