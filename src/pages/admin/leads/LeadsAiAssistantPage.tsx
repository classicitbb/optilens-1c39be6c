import { Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";
import { buildInstagramPostPackPrompt } from "@/features/admin/leads/hooks/useInstagramPostPack";
import { ASSISTANT_ROUTE_DOMAINS, KNOWLEDGE_ASSISTANT_ARCHITECTURE } from "@/features/assistant/knowledgeAssistantArchitecture";

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
  const { guardrails, moduleBoundaries, roleProfiles, sourcePrecedence } = KNOWLEDGE_ASSISTANT_ARCHITECTURE;

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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Role-aware knowledge assistant architecture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="space-y-2">
            <p className="font-medium">Roles + answer modes</p>
            {roleProfiles.map((profile) => (
              <div key={profile.role} className="border rounded p-2 space-y-1">
                <p className="font-medium">{profile.label}</p>
                <p>Domains: {profile.routeDomains.join(", ")}</p>
                <p>Auth required: {profile.authRequired ? "Yes" : "No"}</p>
                <p>Modes: {profile.allowedAnswerModes.join(", ")}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-medium">Composable module boundaries</p>
            {moduleBoundaries.map((boundary) => (
              <div key={boundary.id} className="border rounded p-2 space-y-1">
                <p className="font-medium">{boundary.id}</p>
                <p>Runtime: {boundary.owner}</p>
                <p>{boundary.responsibility}</p>
                <p>Inputs: {boundary.inputs.join(" • ")}</p>
                <p>Outputs: {boundary.outputs.join(" • ")}</p>
                {boundary.notes ? <p>Notes: {boundary.notes}</p> : null}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-medium">Source precedence rules</p>
            {sourcePrecedence.map((rule) => (
              <p key={rule.tier} className="border rounded p-2">
                {rule.priority}. {rule.tier}: {rule.rule}
              </p>
            ))}
          </div>

          <div className="space-y-2">
            <p className="font-medium">Guardrails</p>
            {guardrails.map((guardrail) => (
              <p key={guardrail} className="border rounded p-2">{guardrail}</p>
            ))}
            <p className="text-[11px] text-muted-foreground">Known route domains preserved from shell registry: {ASSISTANT_ROUTE_DOMAINS.join(", ")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsAiAssistantPage;
