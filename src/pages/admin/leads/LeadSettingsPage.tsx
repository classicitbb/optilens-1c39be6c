import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

const LeadSettingsPage = () => {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Leads Settings" icon={Wrench} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scoring + API + Compliance</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p>Scoring weights editor (Volume, Website Weakness, Social Weakness, Supplier Pain, Fit, AI boost).</p>
          <p>API keys: Google Places, Facebook Graph, Instagram Graph.</p>
          <p>Compliance toggles for outreach sequence governance.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadSettingsPage;
