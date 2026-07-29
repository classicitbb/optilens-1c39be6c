import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, Clock3, Pencil, PlusCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrmActivity, useActivities, useCompleteActivity, useMoveActivityChannel, useStaffNames } from "@/features/admin/crm/hooks/useActivities";
import { filterActivitiesByTaskChannel, TASK_CHANNEL_LABELS, TASK_CHANNELS, type ActivityTaskChannel } from "@/features/admin/crm/activityChannels";

type Urgency = "overdue" | "today" | "upcoming";

const URGENCY_META: Record<Urgency, { label: string; icon: typeof AlertTriangle }> = {
  overdue: { label: "Overdue", icon: AlertTriangle },
  today: { label: "Due Today", icon: CalendarClock },
  upcoming: { label: "Upcoming", icon: Clock3 },
};

const getUrgency = (activity: CrmActivity): Urgency => {
  if (!activity.due_at) return "upcoming";
  const due = new Date(activity.due_at);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  if (due < startOfToday) return "overdue";
  if (due < startOfTomorrow) return "today";
  return "upcoming";
};

const CrmActivitiesPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data = [], isLoading } = useActivities();
  const { data: staffNames = {} } = useStaffNames();
  const completeActivity = useCompleteActivity();
  const moveActivityChannel = useMoveActivityChannel();
  const [statusFilter, setStatusFilter] = useState("open");
  const [taskChannelFilter, setTaskChannelFilter] = useState<ActivityTaskChannel | "all">("all");
  const [activeTab, setActiveTab] = useState<Urgency>("overdue");

  const urgencyParam = searchParams.get("urgency");
  useEffect(() => {
    if (urgencyParam === "overdue" || urgencyParam === "today" || urgencyParam === "upcoming") {
      setActiveTab(urgencyParam);
    }
  }, [urgencyParam]);

  const openDialog = (key: "createActivity" | "editActivity", value: string) => {
    const params = new URLSearchParams(location.search);
    params.delete("createActivity");
    params.delete("editActivity");
    params.set(key, value);
    navigate({ pathname: location.pathname, search: `?${params.toString()}` });
  };

  const filtered = useMemo(() => filterActivitiesByTaskChannel(
    data.filter((activity) => statusFilter === "all" || activity.status === statusFilter),
    taskChannelFilter,
  ), [data, statusFilter, taskChannelFilter]);

  const grouped = useMemo(() => {
    const buckets: Record<Urgency, CrmActivity[]> = { overdue: [], today: [], upcoming: [] };
    for (const activity of filtered) buckets[getUrgency(activity)].push(activity);
    return buckets;
  }, [filtered]);

  const renderActivity = (activity: CrmActivity) => {
    const creatorName = activity.created_by ? staffNames[activity.created_by] : undefined;
    const nextChannel = activity.task_channel === "todo" ? "agent_todo" : "todo";
    return (
      <div key={activity.id} className="border rounded p-2 text-xs flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{activity.activity_type}</p>
          <p className="text-muted-foreground">
            <Badge variant="secondary" className="mr-1 text-[10px]">{TASK_CHANNEL_LABELS[activity.task_channel]}</Badge>
            Due: {activity.due_at ? new Date(activity.due_at).toLocaleString() : "—"}
            {creatorName ? ` · Added by ${creatorName}` : ""}
          </p>
          {activity.content ? <p className="text-muted-foreground mt-1 line-clamp-2">{activity.content}</p> : null}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline">{activity.status}</Badge>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => openDialog("editActivity", activity.id)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => void moveActivityChannel.mutateAsync({ id: activity.id, taskChannel: nextChannel })} disabled={moveActivityChannel.isPending}>
            Move to {TASK_CHANNEL_LABELS[nextChannel]}
          </Button>
          {activity.status !== "completed" ? (
            <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void completeActivity.mutateAsync(activity.id)} disabled={completeActivity.isPending}>
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
          <CardTitle className="text-sm flex items-center justify-between">
            Tasks
            <Button size="sm" className="h-8 text-xs" onClick={() => openDialog("createActivity", "1")}>
              <PlusCircle className="h-3.5 w-3.5 mr-1" /> New Task
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent><p className="text-xs text-muted-foreground">Create follow-ups and manage task status from the list below.</p></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            Company Activities
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                <SelectItem value="open" className="text-xs">Open</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={taskChannelFilter} onValueChange={(value) => setTaskChannelFilter(value as ActivityTaskChannel | "all")}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All task channels</SelectItem>
                {TASK_CHANNELS.map((channel) => <SelectItem key={channel} value={channel} className="text-xs">{TASK_CHANNEL_LABELS[channel]}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as Urgency)}>
            <TabsList>
              {(Object.keys(URGENCY_META) as Urgency[]).map((key) => {
                const { label, icon: Icon } = URGENCY_META[key];
                return <TabsTrigger key={key} value={key} className="text-xs gap-1"><Icon className="h-3.5 w-3.5" /> {label}<Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{grouped[key].length}</Badge></TabsTrigger>;
              })}
            </TabsList>
            {(Object.keys(URGENCY_META) as Urgency[]).map((key) => (
              <TabsContent key={key} value={key} className="space-y-2">
                {grouped[key].map(renderActivity)}
                {!isLoading && grouped[key].length === 0 ? <p className="text-xs text-muted-foreground">Nothing here.</p> : null}
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
