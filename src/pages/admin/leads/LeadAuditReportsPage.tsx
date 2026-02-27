import { useMemo, useState } from "react";
import { PieChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";
import { useOpportunities } from "@/features/admin/crm/hooks/useOpportunities";
import { useGenerateLeadAuditReport } from "@/features/admin/leads/hooks/useLeadActions";
import { useToast } from "@/hooks/use-toast";

const LeadAuditReportsPage = () => {
  const { data: opportunities = [] } = useOpportunities();
  const generateAudit = useGenerateLeadAuditReport();
  const { toast } = useToast();
  const [opportunityId, setOpportunityId] = useState("");
  const [score, setScore] = useState("70");

  const selectedOpportunity = useMemo(
    () => opportunities.find((o) => o.id === opportunityId),
    [opportunities, opportunityId]
  );

  const handleGenerate = async () => {
    if (!opportunityId) {
      toast({ title: "Select an opportunity first", variant: "destructive" });
      return;
    }

    try {
      await generateAudit.mutateAsync({ opportunityId, score: Number(score || 70) });
      toast({ title: "Audit generated and attached" });
    } catch {
      toast({ title: "Unable to generate audit", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Audit Reports" icon={PieChart}>
        <BuildCustomPackageButton source="crm_opportunity" context={{ opportunityId: opportunityId || "from-audit" }} className="h-8 text-xs" />
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">6-Section Audit PDF (attachment workflow)</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-3">
          <p>Generate audit data, attach it to an opportunity, then launch Catalog Publisher with context.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={opportunityId} onValueChange={setOpportunityId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select opportunity" />
              </SelectTrigger>
              <SelectContent>
                {opportunities.map((opp) => (
                  <SelectItem key={opp.id} value={opp.id} className="text-xs">
                    {opp.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={score} onChange={(e) => setScore(e.target.value)} className="h-8 text-xs" placeholder="Audit score" />
            <Button size="sm" className="h-8 text-xs" onClick={handleGenerate} disabled={generateAudit.isPending}>
              Generate + Attach Audit
            </Button>
          </div>

          {selectedOpportunity ? (
            <p className="text-muted-foreground">Target: {selectedOpportunity.title} ({selectedOpportunity.country || "—"})</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadAuditReportsPage;
