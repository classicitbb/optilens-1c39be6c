import { useMemo, useState } from "react";
import { Megaphone, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { DEFAULT_SEQUENCE } from "@/features/admin/leads/hooks/useLeadSequenceBuilder";
import { useLeads } from "@/features/admin/leads/hooks/useLeads";
import { useRunLeadSequence } from "@/features/admin/leads/hooks/useLeadActions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const LeadCampaignsPage = () => {
  const { data = [] } = useLeads();
  const [selected, setSelected] = useState<string[]>([]);
  const runSequence = useRunLeadSequence();
  const { toast } = useToast();

  const defaultTargetIds = useMemo(() => data.slice(0, 20).map((lead) => lead.id), [data]);

  const toggleLead = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRun = async () => {
    const targets = selected.length > 0 ? selected : defaultTargetIds;
    if (targets.length === 0) {
      toast({ title: "No leads to run sequence" });
      return;
    }

    try {
      await runSequence.mutateAsync(targets);
      toast({ title: "Sequence queued", description: `${targets.length} lead(s) queued.` });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Campaign request failed compliance or queueing.";
      toast({
        title: "Unable to queue sequence",
        description: message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Campaigns & Sequences" icon={Megaphone}>
        <Button size="sm" onClick={handleRun} disabled={runSequence.isPending}>
          <Play className="h-3.5 w-3.5 mr-1" /> Run Sequence
        </Button>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">5-Step WhatsApp + Email + Instagram DM Flow</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          {DEFAULT_SEQUENCE.map((step) => (
            <p key={step.step}>Step {step.step}: {step.channel} after {step.delayHours}h — {step.prompt}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Target Leads ({selected.length || defaultTargetIds.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {data.slice(0, 20).map((lead) => (
            <label key={lead.id} className="flex items-center gap-2 border rounded p-2 cursor-pointer">
              <Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggleLead(lead.id)} />
              <span className="font-medium">{lead.name}</span>
              <span className="text-muted-foreground">{lead.city || "—"}, {lead.country || "—"}</span>
            </label>
          ))}
          {data.length === 0 ? <p className="text-muted-foreground">No leads available.</p> : null}
          <p className="text-muted-foreground">Tip: if nothing is selected, the first 20 leads are used.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadCampaignsPage;
