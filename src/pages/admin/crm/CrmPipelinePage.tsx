import { useMemo, useState } from "react";
import { Columns3, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOpportunities, useUpdateOpportunityStage } from "@/features/admin/crm/hooks/useOpportunities";

const COLUMNS = [
  { key: "new", title: "New" },
  { key: "contacted", title: "Contacted" },
  { key: "meeting_completed", title: "Meeting Completed" },
  { key: "proposal", title: "Proposal" },
] as const;

const CrmPipelinePage = () => {
  const navigate = useNavigate();
  const { data = [], isLoading } = useOpportunities();
  const updateStage = useUpdateOpportunityStage();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter((o) => !s || o.title.toLowerCase().includes(s) || (o.country ?? "").toLowerCase().includes(s));
  }, [data, search]);

  return (
    <div className="space-y-4">
      <AdminPageHeader title="CRM Pipeline" icon={Columns3}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search opportunities" className="h-8 w-56 text-xs" />
      </AdminPageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const rows = filtered.filter((o) => o.stage === col.key);
          return (
            <Card key={col.key}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  {col.title}
                  <Badge variant="outline">{rows.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.map((o) => (
                  <div key={o.id} className="border rounded p-2 text-xs space-y-2">
                    <div>
                      <p className="font-medium truncate">{o.title}</p>
                      <p className="text-muted-foreground">{o.country || "—"} · {o.volume_tier || "—"}</p>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <Button size="sm" className="h-7 text-[11px]" variant="outline" onClick={() => updateStage.mutate({ id: o.id, stage: "meeting_completed" })}>Meeting Done</Button>
                      <Button
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          navigate("/admin/pricing/publisher", {
                            state: { opportunityId: o.id, country: o.country, volumeTier: o.volume_tier },
                          })
                        }
                      >
                        <ExternalLink className="h-3 w-3 mr-1" /> Build Package
                      </Button>
                    </div>
                  </div>
                ))}
                {rows.length === 0 ? <p className="text-xs text-muted-foreground">No opportunities</p> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? <p className="text-xs text-muted-foreground">Loading CRM pipeline…</p> : null}
    </div>
  );
};

export default CrmPipelinePage;
