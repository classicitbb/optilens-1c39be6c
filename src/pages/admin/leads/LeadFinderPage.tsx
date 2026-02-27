import { Search, MapPinned } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

const LeadFinderPage = () => {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Lead Finder" icon={Search}>
        <div className="flex gap-2">
          <Button size="sm">Find 50 Leads</Button>
          <Button size="sm" variant="outline">Smart Batch</Button>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Search + Map Experience</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p>Planned: Google Places autocomplete, Facebook/Instagram business enrichment, advanced filters.</p>
          <p>Map toggle with pins and lead score cards.</p>
          <p className="inline-flex items-center gap-1"><MapPinned className="h-4 w-4" /> Caribbean city/town pre-populated lists.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadFinderPage;
