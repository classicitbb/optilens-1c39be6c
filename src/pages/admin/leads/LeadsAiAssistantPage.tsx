import { Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";
import { buildInstagramPostPackPrompt } from "@/features/admin/leads/hooks/useInstagramPostPack";

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
    </div>
  );
};

export default LeadsAiAssistantPage;
