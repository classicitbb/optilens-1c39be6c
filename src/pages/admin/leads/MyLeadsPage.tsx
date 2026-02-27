import { useMemo, useState } from "react";
import { Kanban, RefreshCw, DatabaseZap, FileText, Send, Instagram, PlusCircle, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { useCreateLead, useLeads, useSeedSampleLeads } from "@/features/admin/leads/hooks/useLeads";
import BuildCustomPackageButton from "@/features/admin/catalog-publisher-v2/components/BuildCustomPackageButton";
import { useToast } from "@/hooks/use-toast";

const stageBadge = (status: string) => {
  if (status === "proposal") return "bg-violet-500/10 text-violet-700 border-violet-300";
  if (status === "meeting") return "bg-blue-500/10 text-blue-700 border-blue-300";
  if (status === "contacted") return "bg-amber-500/10 text-amber-700 border-amber-300";
  return "bg-slate-500/10 text-slate-700 border-slate-300";
};

const MyLeadsPage = () => {
  const { data = [], isLoading, refetch } = useLeads();
  const createLead = useCreateLead();
  const seedLeads = useSeedSampleLeads();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [form, setForm] = useState({ name: "", city: "", country: "", website: "", score: "" });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return data.filter((lead) => !s || lead.name.toLowerCase().includes(s) || (lead.country ?? "").toLowerCase().includes(s));
  }, [data, search]);

  const buckets = useMemo(() => ({
    lead: filtered.filter((x) => x.status === "lead"),
    contacted: filtered.filter((x) => x.status === "contacted"),
    meeting: filtered.filter((x) => x.status === "meeting"),
    proposal: filtered.filter((x) => x.status === "proposal"),
  }), [filtered]);

  const handleCreateLead = async () => {
    if (!form.name.trim()) {
      toast({ title: "Lead name is required", variant: "destructive" });
      return;
    }

    try {
      await createLead.mutateAsync({
        name: form.name.trim(),
        city: form.city || undefined,
        country: form.country || undefined,
        website: form.website || undefined,
        score: form.score ? Number(form.score) : 0,
        status: "lead",
      });
      setForm({ name: "", city: "", country: "", website: "", score: "" });
      toast({ title: "Lead added" });
    } catch {
      toast({ title: "Unable to add lead", variant: "destructive" });
    }
  };

  const handleSeedLeads = async () => {
    try {
      await seedLeads.mutateAsync();
      toast({ title: "Sample leads seeded" });
    } catch {
      toast({ title: "Unable to seed leads", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="My Leads" icon={Kanban}>
        <div className="flex gap-2 items-center flex-wrap">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads" className="h-8 w-44 text-xs" />
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh Live Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => setView(view === "table" ? "kanban" : "table")}>
            {view === "table" ? "Kanban View" : "Table View"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSeedLeads} disabled={seedLeads.isPending}>
            <Sprout className="h-4 w-4 mr-1" /> Seed Sample Leads
          </Button>
          <BuildCustomPackageButton source="manual" className="h-8 text-xs" />
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Manual Lead Intake</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Store / lead name" className="h-8 text-xs" />
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="h-8 text-xs" />
          <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="h-8 text-xs" />
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website (optional)" className="h-8 text-xs" />
          <div className="flex gap-2">
            <Input value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="Score" className="h-8 text-xs w-20" />
            <Button size="sm" className="h-8 text-xs" onClick={handleCreateLead} disabled={createLead.isPending}>
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Lead
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bulk Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          <Button size="sm" variant="outline" className="h-8 text-xs"><DatabaseZap className="h-3 w-3 mr-1" /> Enrich All</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs"><FileText className="h-3 w-3 mr-1" /> Generate Audits</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs"><Send className="h-3 w-3 mr-1" /> Send Sequence</Button>
          <Button size="sm" variant="outline" className="h-8 text-xs"><Instagram className="h-3 w-3 mr-1" /> Generate IG Posts</Button>
          <Badge variant="outline">Total: {filtered.length}</Badge>
        </CardContent>
      </Card>

      {view === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Command Centre</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            {filtered.map((lead) => (
              <div key={lead.id} className="border rounded p-2 flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-muted-foreground">{lead.city || "—"}, {lead.country || "—"} · Score {lead.score}</p>
                </div>
                <Badge className={stageBadge(lead.status)}>{lead.status}</Badge>
              </div>
            ))}
            {!isLoading && filtered.length === 0 ? <p className="text-muted-foreground">No leads found.</p> : null}
            {isLoading ? <p>Loading leads...</p> : null}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(["lead", "contacted", "meeting", "proposal"] as const).map((k) => (
            <Card key={k}>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between capitalize">
                  {k}
                  <Badge variant="outline">{buckets[k].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {buckets[k].map((lead) => (
                  <div key={lead.id} className="border rounded p-2 text-xs">
                    <p className="font-medium truncate">{lead.name}</p>
                    <p className="text-muted-foreground">Score {lead.score}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyLeadsPage;
