import { Bot, Server, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";
import { buildInstagramPostPackPrompt } from "@/features/admin/leads/hooks/useInstagramPostPack";
import {
  ASSISTANT_MODULE_MAP,
  SUPPORTED_ANSWER_MODES,
  SUPPORTED_ROLES,
} from "@/features/admin/leads/assistant/ui/assistantModuleMap";

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
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Role-Aware Knowledge Assistant Architecture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p>Composable modules preserve route groups while keeping model/external integrations on server-side services only.</p>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_ROLES.map((role) => (
              <Badge variant="secondary" key={role}>{role}</Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_ANSWER_MODES.map((mode) => (
              <Badge variant="outline" key={mode}>{mode}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4" />
            Internal Module Boundaries
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {ASSISTANT_MODULE_MAP.map((module) => (
            <div key={module.module} className="border rounded p-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{module.module}</p>
                <Badge variant={module.ownership === "server-service" ? "default" : "secondary"}>{module.ownership}</Badge>
              </div>
              <p className="text-muted-foreground">{module.responsibility}</p>
            </div>
          ))}
        </CardContent>
      </Card>

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
