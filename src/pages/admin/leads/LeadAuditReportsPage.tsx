import { PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";

const LeadAuditReportsPage = () => {
  return (
    <div className="space-y-4">
      <AdminPageHeader title="Audit Reports" icon={PieChart}>
        <BuildCustomPackageButton source="crm_opportunity" context={{ opportunityId: "from-audit" }} className="h-8 text-xs" />
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">6-Section Audit PDF</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-2">
          <p>One-click attach to opportunity opens new Catalog Publisher with prefill context.</p>
          <Button size="sm" variant="outline">Generate Audit PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadAuditReportsPage;
