import { Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";
import { buildInstagramPostPackPrompt } from "@/features/admin/leads/hooks/useInstagramPostPack";

const CTA_TEMPLATES = {
  owner_ceo: [
    "Would you like a 15-minute margin-growth walkthrough tailored to your top-selling lens mix?",
    "Reply 'ROI' and I'll send a CEO-ready one-page plan with projected reorder uplift.",
    "Open to reviewing a supplier continuity plan that protects both cash flow and service levels?",
  ],
  manager: [
    "Want a quick ops checklist to cut remakes and speed turnaround this month?",
    "Reply 'TEAM' to get a ready-to-run rollout script for your staff and front desk.",
    "Can I share a sample weekly order cadence your team can implement immediately?",
  ],
};

const LeadsAiAssistantPage = () => {
  const prompt = buildInstagramPostPackPrompt("Sample Optical Store", "Barbados");

  return (
    <div className="space-y-4">
      <AdminPageHeader title="AI Assistant" icon={Bot}>
        <BuildCustomPackageButton source="leads_ai" className="h-8 text-xs" />
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lead AI Brain</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>Pre-built actions: WhatsApp opener, Email with Audit PDF, Full Proposal, IG Post Pack, Objection Handling.</p>
          <p className="font-medium">Instagram generator prompt seed:</p>
          <pre className="text-[10px] bg-muted p-2 rounded whitespace-pre-wrap">{prompt}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Persona CTA + Message Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="space-y-1">
            <p className="font-medium">Owner / CEO persona</p>
            {CTA_TEMPLATES.owner_ceo.map((template) => (
              <p key={template} className="border rounded p-2">{template}</p>
            ))}
          </div>
          <div className="space-y-1">
            <p className="font-medium">Manager persona</p>
            {CTA_TEMPLATES.manager.map((template) => (
              <p key={template} className="border rounded p-2">{template}</p>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsAiAssistantPage;
