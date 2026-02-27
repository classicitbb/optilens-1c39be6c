import { Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { DEFAULT_SEQUENCE } from "@/features/admin/leads/hooks/useLeadSequenceBuilder";

const LeadCampaignsPage = () => {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Campaigns & Sequences" icon={Megaphone} />

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
    </div>
  );
};

export default LeadCampaignsPage;
