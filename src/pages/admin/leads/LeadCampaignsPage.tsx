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
import {
  useCampaignActivationProfiles,
  useCreateCampaignActivationProfiles,
  useLogCampaignPerformance,
} from "@/features/admin/leads/hooks/useCampaignActivation";

interface ActivationProfileRow {
  id: string;
  contact_id: string | null;
  lead_source: string;
  lead_segment: string;
  packet?: {
    audienceHypotheses?: string[];
    creativeAngles?: string[];
    metaAudienceDefinitions?: string[];
    metaMessagingVariants?: string[];
  } | null;
}

const LeadCampaignsPage = () => {
  const { data = [] } = useLeads();
  const [selected, setSelected] = useState<string[]>([]);
  const runSequence = useRunLeadSequence();
  const createProfiles = useCreateCampaignActivationProfiles();
  const logPerformance = useLogCampaignPerformance();
  const { toast } = useToast();

  const defaultTargetIds = useMemo(() => data.slice(0, 20).map((lead) => lead.id), [data]);
  const activeTargetIds = selected.length > 0 ? selected : defaultTargetIds;
  const selectedLeads = useMemo(() => data.filter((lead) => activeTargetIds.includes(lead.id)), [data, activeTargetIds]);
  const { data: profiles = [] } = useCampaignActivationProfiles(activeTargetIds);

  const toggleLead = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleRun = async () => {
    const targets = activeTargetIds;
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

  const handleGeneratePackets = async () => {
    if (selectedLeads.length === 0) {
      toast({ title: "No leads selected", description: "Select at least one lead (or keep default first 20)." });
      return;
    }
    await createProfiles.mutateAsync(selectedLeads);
    toast({ title: "Campaign packets generated", description: `${selectedLeads.length} activation profiles created.` });
  };

  const handleLogSamplePerformance = async () => {
    const profile = profiles[0];
    if (!profile) {
      toast({ title: "No activation profile", description: "Generate a packet first to track campaign performance." });
      return;
    }
    await logPerformance.mutateAsync({
      profileId: profile.id,
      contactId: profile.contact_id,
      leadSource: profile.lead_source,
      leadSegment: profile.lead_segment,
      channel: "meta",
      campaignName: "Meta Prospecting - Segment Pilot",
      impressions: 4200,
      clicks: 188,
      qualifiedLeads: 24,
      conversions: 6,
      spend: 186.4,
      revenue: 1890,
    });
    toast({ title: "Performance logged", description: "Sample downstream campaign performance tied to source + segment." });
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Campaigns & Sequences" icon={Megaphone}>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleGeneratePackets} disabled={createProfiles.isPending}>
            Generate Campaign Packets
          </Button>
          <Button size="sm" variant="outline" onClick={handleLogSamplePerformance} disabled={logPerformance.isPending}>
            Log Performance
          </Button>
          <Button size="sm" onClick={handleRun} disabled={runSequence.isPending}>
            <Play className="h-3.5 w-3.5 mr-1" /> Run Sequence
          </Button>
        </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Campaign Activation Artifacts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          {(profiles as ActivationProfileRow[]).slice(0, 6).map((profile) => (
            <div key={profile.id} className="border rounded p-2 space-y-2">
              <p className="font-medium">{profile.lead_segment.split("_").join(" ")} · Source: {profile.lead_source}</p>
              <p>Audience hypotheses: {(profile.packet?.audienceHypotheses ?? []).join(" | ")}</p>
              <p>Creative angles: {(profile.packet?.creativeAngles ?? []).join(" | ")}</p>
              <p>Meta audiences (policy-compliant): {(profile.packet?.metaAudienceDefinitions ?? []).join(" | ")}</p>
              <p>Meta messaging variants: {(profile.packet?.metaMessagingVariants ?? []).join(" | ")}</p>
            </div>
          ))}
          {profiles.length === 0 ? <p className="text-muted-foreground">No campaign packets generated yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadCampaignsPage;
