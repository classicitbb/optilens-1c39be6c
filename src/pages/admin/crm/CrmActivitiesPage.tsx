import { useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, Clock3, PlusCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACTIVITY_TYPES,
  ActivityChannelType,
  CrmActivity,
  useActivities,
  useCompleteActivity,
  useCreateActivity,
  useStaffNames,
} from "@/features/admin/crm/hooks/useActivities";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Urgency = "overdue" | "today" | "upcoming";

const URGENCY_META: Record<Urgency, { label: string; icon: typeof AlertTriangle }> = {
  overdue: { label: "Overdue", icon: AlertTriangle },
  today: { label: "Due Today", icon: CalendarClock },
  upcoming: { label: "Upcoming", icon: Clock3 },
};

const getUrgency = (a: CrmActivity): Urgency => {
  if (!a.due_at) return "upcoming";
  const due = new Date(a.due_at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  if (due < startOfToday) return "overdue";
  if (due < startOfTomorrow) return "today";
  return "upcoming";
};

const CrmActivitiesPage = () => {
  const { data = [], isLoading } = useActivities();
  const { data: staffNames = {} } = useStaffNames();
  const createActivity = useCreateActivity();
  const completeActivity = useCompleteActivity();
  const { user } = useAuth();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("open");
  const [activeTab, setActiveTab] = useState<Urgency>("overdue");
  const [form, setForm] = useState<{ activityType: string; dueAt: string; type: ActivityChannelType }>({
    activityType: "",
    dueAt: "",
    type: "note",
  });

  const filtered = useMemo(
    () => data.filter((a) => statusFilter === "all" || a.status === statusFilter),
    [data, statusFilter]
  );

  const grouped = useMemo(() => {
    const buckets: Record<Urgency, CrmActivity[]> = { overdue: [], today: [], upcoming: [] };
    for (const a of filtered) {
      buckets[getUrgency(a)].push(a);
    }
    return buckets;
  }, [filtered]);

  const handleCreate = async () => {
    if (!form.activityType.trim()) {
      toast({ title: "Activity type required", variant: "destructive" });
      return;
    }

    try {
      await createActivity.mutateAsync({
        activityType: form.activityType.trim(),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
        type: form.type,
        createdBy: user?.id,
      });
      setForm({ activityType: "", dueAt: "", type: "note" });
      toast({ title: "Activity created" });
    } catch {
      toast({ title: "Unable to create activity", variant: "destructive" });
    }
  };

  const renderActivity = (a: CrmActivity) => {
    const creatorName = a.created_by ? staffNames[a.created_by] : undefined;
    return (
      <div key={a.id} className="border rounded p-2 text-xs flex items-center justify-between gap-2">
        <div>
          <p className="font-medium">{a.activity_type}</p>
          <p className="text-muted-foreground">
            Due: {a.due_at ? new Date(a.due_at).toLocaleString() : "—"}
            {creatorName ? ` · Added by ${creatorName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{a.status}</Badge>
          {a.status !== "completed" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={async () => {
                try {
                  await completeActivity.mutateAsync(a.id);
                  toast({ title: "Activity completed" });
                } catch {
                  toast({ title: "Unable to update activity", variant: "destructive" });
                }
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
            </Button>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="CRM Activities" icon={CalendarCheck} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Create Activity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input
            value={form.activityType}
            onChange={(e) => setForm({ ...form, activityType: e.target.value })}
            placeholder="e.g., Follow-up call"
            className="h-8 text-xs"
          />
          <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as ActivityChannelType })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIVITY_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="datetime-local"
            value={form.dueAt}
            onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={createActivity.isPending}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Activity
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            Company Activities
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="open" className="text-xs">Open</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Urgency)}>
            <TabsList>
              {(Object.keys(URGENCY_META) as Urgency[]).map((key) => {
                const { label, icon: Icon } = URGENCY_META[key];
                return (
                  <TabsTrigger key={key} value={key} className="text-xs gap-1">
                    <Icon className="h-3.5 w-3.5" /> {label}
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {grouped[key].length}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {(Object.keys(URGENCY_META) as Urgency[]).map((key) => (
              <TabsContent key={key} value={key} className="space-y-2">
                {grouped[key].map(renderActivity)}
                {!isLoading && grouped[key].length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nothing here.</p>
                ) : null}
              </TabsContent>
            ))}
          </Tabs>
          {isLoading ? <p className="text-xs text-muted-foreground">Loading activities…</p> : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmActivitiesPage;
