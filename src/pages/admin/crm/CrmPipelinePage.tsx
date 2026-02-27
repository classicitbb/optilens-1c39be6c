import { useMemo, useState } from "react";
import { Columns3, ExternalLink, PlusCircle, Sprout } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCreateOpportunity, useOpportunities, useSeedSampleOpportunities, useUpdateOpportunityStage } from "@/features/admin/crm/hooks/useOpportunities";
import { useCreateActivity } from "@/features/admin/crm/hooks/useActivities";
import { useToast } from "@/hooks/use-toast";

const COLUMNS = [
  { key: "new", title: "New" },
  { key: "contacted", title: "Contacted" },
  { key: "meeting_completed", title: "Meeting Completed" },
  { key: "proposal", title: "Proposal" },
] as const;

const CrmPipelinePage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data = [], isLoading } = useOpportunities();
  const updateStage = useUpdateOpportunityStage();
  const createOpportunity = useCreateOpportunity();
  const seedOpportunities = useSeedSampleOpportunities();
  const createActivity = useCreateActivity();

  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ contactName: "", opportunityTitle: "", country: "", city: "", estimatedValue: "" });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter((o) => !s || o.title.toLowerCase().includes(s) || (o.country ?? "").toLowerCase().includes(s));
  }, [data, search]);

  const handleCreateOpportunity = async () => {
    if (!form.contactName.trim() || !form.opportunityTitle.trim()) {
      toast({ title: "Contact and opportunity title are required", variant: "destructive" });
      return;
    }

    try {
      await createOpportunity.mutateAsync({
        contactName: form.contactName.trim(),
        opportunityTitle: form.opportunityTitle.trim(),
        country: form.country || undefined,
        city: form.city || undefined,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        stage: "new",
      });
      setForm({ contactName: "", opportunityTitle: "", country: "", city: "", estimatedValue: "" });
      toast({ title: "Opportunity added" });
    } catch {
      toast({ title: "Unable to add opportunity", variant: "destructive" });
    }
  };

  const handleSeedOpportunities = async () => {
    try {
      await seedOpportunities.mutateAsync();
      toast({ title: "Sample opportunities seeded" });
    } catch {
      toast({ title: "Unable to seed opportunities", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="CRM Pipeline" icon={Columns3}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search opportunities" className="h-8 w-56 text-xs" />
          <Button variant="outline" size="sm" onClick={handleSeedOpportunities} disabled={seedOpportunities.isPending}>
            <Sprout className="h-4 w-4 mr-1" /> Seed Sample Opportunities
          </Button>
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Manual Opportunity Intake</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Contact / store name" className="h-8 text-xs" />
          <Input value={form.opportunityTitle} onChange={(e) => setForm({ ...form, opportunityTitle: e.target.value })} placeholder="Opportunity title" className="h-8 text-xs" />
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-8 text-xs" />
          <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="h-8 text-xs" />
          <div className="flex gap-2">
            <Input value={form.estimatedValue} onChange={(e) => setForm({ ...form, estimatedValue: e.target.value })} placeholder="Est. value" className="h-8 text-xs w-24" />
            <Button size="sm" className="h-8 text-xs" onClick={handleCreateOpportunity} disabled={createOpportunity.isPending}>
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

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
                        variant="outline"
                        onClick={async () => {
                          try {
                            const due = new Date();
                            due.setDate(due.getDate() + 1);
                            await createActivity.mutateAsync({
                              activityType: "Pipeline follow-up",
                              opportunityId: o.id,
                              contactId: o.contact_id,
                              dueAt: due.toISOString(),
                            });
                            toast({ title: "Follow-up task created" });
                          } catch {
                            toast({ title: "Unable to create follow-up", variant: "destructive" });
                          }
                        }}
                      >
                        Follow-up
                      </Button>
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
