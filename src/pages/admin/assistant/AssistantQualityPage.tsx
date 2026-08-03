import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type FeedbackRow = {
  id: string;
  vote: "helpful" | "not_helpful";
  comment: string | null;
  audience: string;
  intent: string;
  answer_mode: string;
  confidence: string;
  route: string | null;
  citation_ids: string[] | null;
  created_at: string;
};

const AssistantQualityPage = () => {
  const { data: feedback = [], isLoading, error } = useQuery({
    queryKey: ["assistant-quality-feedback"],
    queryFn: async () => {
      const { data, error: queryError } = await (supabase as any)
        .from("assistant_feedback")
        .select("id,vote,comment,audience,intent,answer_mode,confidence,route,citation_ids,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (queryError) throw queryError;
      return (data ?? []) as FeedbackRow[];
    },
    staleTime: 30_000,
  });

  const totals = useMemo(() => ({
    helpful: feedback.filter((row) => row.vote === "helpful").length,
    notHelpful: feedback.filter((row) => row.vote === "not_helpful").length,
  }), [feedback]);

  const negativeFeedback = feedback.filter((row) => row.vote === "not_helpful").slice(0, 25);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Assistant quality</h1>
        <p className="text-sm text-muted-foreground">
          Review helpfulness signals and knowledge gaps. Private conversation content is intentionally not shown here.
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">Unable to load assistant feedback.</p> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Helpful</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-2xl font-semibold"><ThumbsUp className="h-5 w-5 text-emerald-600" />{totals.helpful}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Needs improvement</CardTitle></CardHeader><CardContent className="flex items-center gap-2 text-2xl font-semibold"><ThumbsDown className="h-5 w-5 text-amber-600" />{totals.notHelpful}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Responses reviewed</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{feedback.length}</CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Knowledge-gap queue</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading feedback…</p> : null}
          {!isLoading && negativeFeedback.length === 0 ? <p className="text-sm text-muted-foreground">No negative feedback has been recorded.</p> : null}
          {negativeFeedback.map((row) => (
            <div key={row.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{row.audience}</Badge><Badge variant="secondary">{row.intent}</Badge><Badge variant="secondary">{row.answer_mode}</Badge><Badge variant="outline">{row.confidence} confidence</Badge></div>
              <p className="text-sm">{row.comment || "No additional comment provided."}</p>
              <p className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()} {row.route ? `• ${row.route}` : ""} • {row.citation_ids?.length ?? 0} sources</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default AssistantQualityPage;
