import { ArrowLeft, ExternalLink, FileText, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRxDraft } from "@/features/lens-assistant/api";

const RxDraftSection = () => {
  const { draftId } = useParams();
  const { data: draft, isLoading } = useRxDraft(draftId);

  if (isLoading) return <div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!draft) return <Card><CardContent className="py-12 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">Rx draft not found</p><p className="mt-1 text-sm text-muted-foreground">It may have been removed, or the lens-assistant migration is not available yet.</p></CardContent></Card>;

  const recommendations = draft.recommendation_snapshot?.recommendations ?? [];
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild><Link to="/profile/drafts"><ArrowLeft className="mr-2 h-4 w-4" />Back to drafts</Link></Button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-2xl font-semibold">{draft.name}</h1><p className="mt-1 text-sm text-muted-foreground">Saved {new Date(draft.updated_at).toLocaleString()}</p></div>
        <Badge className="capitalize">{draft.status.replace(/_/g, " ")}</Badge>
      </div>
      <Card><CardHeader><CardTitle>Prescription summary</CardTitle></CardHeader><CardContent className="grid gap-4 text-sm sm:grid-cols-2">
        <p><span className="text-muted-foreground">Right eye</span><br />SPH {draft.input_payload.right.sphere ?? "—"} · CYL {draft.input_payload.right.cylinder ?? "—"} · AXIS {draft.input_payload.right.axis ?? "—"} · ADD {draft.input_payload.right.add ?? "—"}</p>
        <p><span className="text-muted-foreground">Left eye</span><br />SPH {draft.input_payload.left.sphere ?? "—"} · CYL {draft.input_payload.left.cylinder ?? "—"} · AXIS {draft.input_payload.left.axis ?? "—"} · ADD {draft.input_payload.left.add ?? "—"}</p>
      </CardContent></Card>
      <div className="grid gap-4 md:grid-cols-3">{recommendations.map((option) => <Card key={option.productId}><CardHeader><Badge className="w-fit capitalize">{option.tier}</Badge><CardTitle className="text-lg">{option.productName}</CardTitle></CardHeader><CardContent className="text-sm"><p>{option.material || "Material to confirm"}</p><p className="mt-2 font-semibold">{option.priceBbd != null ? `BBD $${Number(option.priceBbd).toFixed(2)}` : "Price not assigned"}</p></CardContent></Card>)}</div>
      <AlertDraftNotice />
      <Button asChild size="lg"><Link to={`/rx-order?draft=${draft.id}`}>Open beside LabLink <ExternalLink className="ml-2 h-4 w-4" /></Link></Button>
    </div>
  );
};

const AlertDraftNotice = () => <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">This is a portal draft, not a submitted lab order. Final submission and confirmation happen in LabLink.</div>;

export default RxDraftSection;
