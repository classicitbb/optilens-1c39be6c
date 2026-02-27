import { Kanban, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useLeads } from "@/features/admin/leads/hooks/useLeads";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";

const MyLeadsPage = () => {
  const { data = [], isLoading, refetch } = useLeads();

  return (
    <div className="space-y-4">
      <AdminPageHeader title="My Leads" icon={Kanban}>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh Live Data
          </Button>
          <BuildCustomPackageButton source="manual" className="h-8 text-xs" />
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lead Command Centre</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1">
          <p>Total leads: {data.length}</p>
          <p>Bulk actions planned: Enrich All, Generate Audits, Send Sequence, Generate IG Posts.</p>
          {isLoading ? <p>Loading leads...</p> : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default MyLeadsPage;
