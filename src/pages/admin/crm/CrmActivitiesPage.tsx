import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import {
  AlertTriangle, Bot, CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDot, Clock3, Columns3, List, Loader2, Mail, MoreHorizontal, Pencil, Plus,
  PlusCircle, Search, Sparkles, UserRound, UsersRound,
} from "lucide-react";
import { eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ACTIVITY_PRIORITIES, ACTIVITY_STATES, ACTIVITY_TYPES,
  type ActivityPriority, type ActivityState, type AutomationRecipe, type CrmActivity,
  useActivities, useAddAutomation, useApproveAutomationRun, useStaffNames, useTransitionActivity,
} from "@/features/admin/crm/hooks/useActivities";
import {
  FOCUS_BUCKETS, FOCUS_BUCKET_LABELS, PRIORITY_LABELS, STATE_LABELS,
  dueDateForBucket, getFocusBucket, isActivityOverdue, isOpenActivity, matchesPreset,
  type FocusBucket, type FocusPreset,
} from "@/features/admin/crm/focusDesk";
import { TASK_CHANNEL_LABELS, TASK_CHANNELS, type ActivityTaskChannel } from "@/features/admin/crm/activityChannels";

type DeskView = "board" | "calendar" | "list";
const PRIORITY_STYLES: Record<ActivityPriority, string> = {
  urgent: "border-l-rose-500", high: "border-l-amber-500", normal: "border-l-sky-500", low: "border-l-slate-300",
};
const initials = (name?: string) => (name || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const customerName = (activity: CrmActivity) => activity.contact?.business_name || activity.contact?.name || null;
const automationLabel: Record<AutomationRecipe, string> = {
  draft_customer_email: "Prepare customer email", add_participant: "Add helper or follower",
  create_follow_up: "Create follow-up task", prepare_activity: "Prepare another activity",
};

interface TaskCardProps { activity: CrmActivity; staffNames: Record<string, string>; onOpen: () => void }
const TaskCard = ({ activity, staffNames, onOpen }: TaskCardProps) => {
  const helpers = activity.participants.filter((person) => person.role === "helper");
  const latestRun = activity.automation_runs[0];
  return (
    <button
      type="button" draggable onDragStart={(event) => event.dataTransfer.setData("text/crm-activity-id", activity.id)}
      onClick={onOpen}
      className={cn("w-full rounded-lg border border-l-4 bg-card p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", PRIORITY_STYLES[activity.priority])}
    >
      <div className="flex items-start justify-between gap-2"><span className="text-sm font-semibold leading-snug">{activity.activity_type}</span><Badge variant="outline" className="shrink-0 text-[10px] capitalize">{activity.type}</Badge></div>
      {customerName(activity) ? <p className="mt-1 truncate text-xs text-muted-foreground">{customerName(activity)}</p> : null}
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className={cn("flex items-center gap-1", isActivityOverdue(activity) && "font-semibold text-destructive")}><Clock3 className="h-3 w-3" />{activity.due_at ? format(new Date(activity.due_at), "MMM d, h:mm a") : "Unscheduled"}</span>
        <div className="flex -space-x-1.5">
          <Avatar className="h-6 w-6 border-2 border-card"><AvatarFallback className="text-[9px]">{initials(activity.owner_id ? staffNames[activity.owner_id] : "?")}</AvatarFallback></Avatar>
          {helpers.slice(0, 2).map((person) => <Avatar key={person.user_id} className="h-6 w-6 border-2 border-card"><AvatarFallback className="text-[9px]">{initials(person.name)}</AvatarFallback></Avatar>)}
        </div>
      </div>
      {(activity.automations.length > 0 || latestRun) ? <div className="mt-2 flex items-center gap-1 border-t pt-2 text-[10px] text-muted-foreground"><Sparkles className="h-3 w-3" />{latestRun?.status === "approval_needed" ? "Approval needed" : latestRun?.status === "needs_attention" ? "Needs attention" : `${activity.automations.length} automation${activity.automations.length === 1 ? "" : "s"}`}</div> : null}
    </button>
  );
};

interface BoardProps { activities: CrmActivity[]; staffNames: Record<string, string>; onOpen: (activity: CrmActivity) => void; onDrop: (activityId: string, bucket: FocusBucket) => void }
const FocusBoard = ({ activities, staffNames, onOpen, onDrop }: BoardProps) => {
  const grouped = useMemo(() => Object.fromEntries(FOCUS_BUCKETS.map((bucket) => [bucket, activities.filter((activity) => getFocusBucket(activity) === bucket)])) as Record<FocusBucket, CrmActivity[]>, [activities]);
  return <div className="grid min-w-[980px] grid-cols-5 gap-3">{FOCUS_BUCKETS.map((bucket) => <section key={bucket} className="min-h-[420px] rounded-xl bg-muted/35 p-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const id = event.dataTransfer.getData("text/crm-activity-id"); if (id) onDrop(id, bucket); }}><div className="mb-2 flex items-center justify-between px-1"><h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{FOCUS_BUCKET_LABELS[bucket]}</h2><Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{grouped[bucket].length}</Badge></div><div className="space-y-2">{grouped[bucket].map((activity) => <TaskCard key={activity.id} activity={activity} staffNames={staffNames} onOpen={() => onOpen(activity)} />)}{grouped[bucket].length === 0 ? <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Drop a task here</div> : null}</div></section>)}</div>;
};

interface CalendarViewProps { activities: CrmActivity[]; onOpen: (activity: CrmActivity) => void }
const CalendarView = ({ activities, onOpen }: CalendarViewProps) => {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const days = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(month)), end: endOfWeek(endOfMonth(month)) }), [month]);
  return <div className="rounded-xl border bg-card"><div className="flex items-center justify-between border-b p-3"><Button variant="ghost" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous month</span></Button><h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2><Button variant="ghost" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /><span className="sr-only">Next month</span></Button></div><div className="grid grid-cols-7 border-b bg-muted/20 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="p-2">{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const dayActivities = activities.filter((activity) => activity.due_at && isSameDay(new Date(activity.due_at), day)); return <div key={day.toISOString()} className={cn("min-h-28 border-b border-r p-1.5", !isSameMonth(day, month) && "bg-muted/20 text-muted-foreground")}><span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", isSameDay(day, new Date()) && "bg-primary text-primary-foreground")}>{format(day, "d")}</span><div className="mt-1 space-y-1">{dayActivities.slice(0, 3).map((activity) => <button key={activity.id} type="button" onClick={() => onOpen(activity)} className={cn("block w-full truncate rounded border-l-2 bg-background px-1.5 py-1 text-left text-[10px] shadow-sm", PRIORITY_STYLES[activity.priority])}>{activity.activity_type}</button>)}{dayActivities.length > 3 ? <span className="px-1 text-[10px] text-muted-foreground">+{dayActivities.length - 3} more</span> : null}</div></div>; })}</div></div>;
};

interface ListViewProps { activities: CrmActivity[]; staffNames: Record<string, string>; onOpen: (activity: CrmActivity) => void }
const CompactList = ({ activities, staffNames, onOpen }: ListViewProps) => <div className="overflow-hidden rounded-xl border bg-card"><div className="grid grid-cols-[minmax(260px,2fr)_1fr_120px_150px_110px] border-b bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Task</span><span>Owner</span><span>Priority</span><span>Due</span><span>State</span></div>{activities.map((activity) => <button key={activity.id} type="button" onClick={() => onOpen(activity)} className="grid w-full grid-cols-[minmax(260px,2fr)_1fr_120px_150px_110px] items-center border-b px-3 py-3 text-left text-xs hover:bg-muted/30"><span><strong className="block truncate text-sm">{activity.activity_type}</strong><span className="text-muted-foreground">{customerName(activity) || TASK_CHANNEL_LABELS[activity.task_channel]}</span></span><span>{activity.owner_id ? staffNames[activity.owner_id] ?? "Staff member" : "Unassigned"}</span><span>{PRIORITY_LABELS[activity.priority]}</span><span className={cn(isActivityOverdue(activity) && "font-semibold text-destructive")}>{activity.due_at ? format(new Date(activity.due_at), "MMM d, h:mm a") : "—"}</span><span>{STATE_LABELS[activity.status]}</span></button>)}{activities.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">No tasks match these filters.</p> : null}</div>;

interface DetailProps { activity: CrmActivity | null; staffNames: Record<string, string>; onClose: () => void; onEdit: () => void; onTransition: (state: ActivityState) => Promise<void> }
const TaskDetail = ({ activity, staffNames, onClose, onEdit, onTransition }: DetailProps) => {
  const { toast } = useToast();
  const addAutomation = useAddAutomation();
  const approveRun = useApproveAutomationRun();
  const [recipe, setRecipe] = useState<AutomationRecipe>("draft_customer_email");
  if (!activity) return null;
  const helpers = activity.participants.filter((person) => person.role === "helper");
  const addRecipe = async () => { try { await addAutomation.mutateAsync({ activityId: activity.id, recipe }); toast({ title: "Automation recipe attached" }); } catch (error) { toast({ title: "Unable to attach recipe", description: error instanceof Error ? error.message : undefined, variant: "destructive" }); } };
  const approve = async (runId: string) => { try { await approveRun.mutateAsync(runId); toast({ title: "Automation completed" }); } catch (error) { toast({ title: "Automation needs attention", description: error instanceof Error ? error.message : undefined, variant: "destructive" }); } };
  return <Sheet open onOpenChange={(open) => !open && onClose()}><SheetContent className="w-full overflow-y-auto sm:max-w-xl"><SheetHeader><SheetTitle className="pr-8">{activity.activity_type}</SheetTitle><SheetDescription>{customerName(activity) || "General CRM task"}</SheetDescription></SheetHeader><div className="mt-5 space-y-6">
    <div className="flex flex-wrap gap-2"><Badge>{PRIORITY_LABELS[activity.priority]}</Badge><Badge variant="outline">{STATE_LABELS[activity.status]}</Badge><Badge variant="secondary" className="capitalize">{activity.type}</Badge><Badge variant="secondary">{TASK_CHANNEL_LABELS[activity.task_channel]}</Badge></div>
    <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-xs"><div><span className="text-muted-foreground">Owner</span><p className="mt-1 font-medium">{activity.owner_id ? staffNames[activity.owner_id] ?? "Staff member" : "Unassigned"}</p></div><div><span className="text-muted-foreground">Due</span><p className="mt-1 font-medium">{activity.due_at ? format(new Date(activity.due_at), "PPP 'at' p") : "Unscheduled"}</p></div><div className="col-span-2"><span className="text-muted-foreground">Helpers</span><p className="mt-1 font-medium">{helpers.length ? helpers.map((person) => person.name).join(", ") : "No helpers yet"}</p></div></div>
    {activity.content ? <section><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{activity.content}</p></section> : null}
    <section><div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick actions</h3><Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => void onTransition("in_progress")}><CircleDot className="mr-2 h-4 w-4" />Start</Button><Button variant="outline" onClick={() => void onTransition("waiting")}><Clock3 className="mr-2 h-4 w-4" />Wait</Button><Button variant="outline" onClick={() => void onTransition("planned")}><CalendarDays className="mr-2 h-4 w-4" />Plan</Button><Button onClick={() => void onTransition("completed")}><CheckCircle2 className="mr-2 h-4 w-4" />Complete</Button></div></section>
    <section className="rounded-xl border p-3"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">Automation recipes</h3></div><p className="mt-1 text-xs text-muted-foreground">Recipes trigger when this task moves to In progress. Every action waits for approval.</p><div className="mt-3 flex gap-2"><Select value={recipe} onValueChange={(value) => setRecipe(value as AutomationRecipe)}><SelectTrigger className="min-w-0"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(automationLabel).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button size="icon" aria-label="Attach automation recipe" onClick={() => void addRecipe()} disabled={addAutomation.isPending}><Plus className="h-4 w-4" /></Button></div><div className="mt-3 space-y-2">{activity.automations.map((automation) => <div key={automation.id} className="flex items-center justify-between rounded-md bg-muted/40 p-2 text-xs"><span>{automationLabel[automation.recipe]}</span><Badge variant="outline">On in progress</Badge></div>)}{activity.automations.length === 0 ? <p className="text-xs text-muted-foreground">No recipes attached.</p> : null}</div></section>
    <section><h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity and approvals</h3><div className="mt-2 space-y-2"><div className="flex gap-2 rounded-lg border p-3 text-xs"><Check className="h-4 w-4 text-muted-foreground" /><div><strong>Task created</strong><p className="text-muted-foreground">{format(new Date(activity.created_at), "PPP 'at' p")}</p></div></div>{activity.automation_runs.map((run) => <div key={run.id} className="rounded-lg border p-3 text-xs"><div className="flex items-start justify-between gap-2"><div><strong>{automationLabel[run.proposed_action.recipe]}</strong><p className="mt-1 text-muted-foreground">{run.status.replace("_", " ")}{run.error ? ` · ${run.error}` : ""}</p></div>{run.status === "approval_needed" || run.status === "needs_attention" ? <Button size="sm" onClick={() => void approve(run.id)} disabled={approveRun.isPending}>{approveRun.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}</Button> : <Badge variant="outline">{run.status}</Badge>}</div></div>)}</div></section>
  </div></SheetContent></Sheet>;
};

const CrmActivitiesPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data = [], isLoading } = useActivities();
  const { data: staffNames = {} } = useStaffNames();
  const transition = useTransitionActivity();
  const [view, setView] = useState<DeskView>("board");
  const [preset, setPreset] = useState<FocusPreset>("my_focus");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [priority, setPriority] = useState<ActivityPriority | "all">("all");
  const [state, setState] = useState<ActivityState | "open" | "all">("open");
  const [owner, setOwner] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [taskChannel, setTaskChannel] = useState<ActivityTaskChannel | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("task"));
  const selected = data.find((activity) => activity.id === selectedId) ?? null;

  useEffect(() => { const urgency = searchParams.get("urgency"); if (urgency === "overdue") setPreset("overdue"); }, [searchParams]);
  const openDialog = (key: "createActivity" | "editActivity", value: string) => { const params = new URLSearchParams(location.search); params.delete("createActivity"); params.delete("editActivity"); params.set(key, value); navigate({ pathname: location.pathname, search: `?${params}` }); };
  const filtered = useMemo(() => data.filter((activity) => {
    if (!matchesPreset(activity, preset, user?.id)) return false;
    if (priority !== "all" && activity.priority !== priority) return false;
    if (state === "open" && !isOpenActivity(activity)) return false;
    if (state !== "all" && state !== "open" && activity.status !== state) return false;
    if (owner !== "all" && activity.owner_id !== owner) return false;
    if (activityType !== "all" && activity.type !== activityType) return false;
    if (taskChannel !== "all" && activity.task_channel !== taskChannel) return false;
    if (deferredSearch) { const haystack = [activity.activity_type, activity.content, customerName(activity), activity.owner_id ? staffNames[activity.owner_id] : "", ...activity.participants.map((person) => person.name)].filter(Boolean).join(" ").toLowerCase(); if (!haystack.includes(deferredSearch)) return false; }
    return true;
  }), [activityType, data, deferredSearch, owner, preset, priority, staffNames, state, taskChannel, user?.id]);
  const priorityShelf = useMemo(() => filtered.filter((activity) => isActivityOverdue(activity) || activity.priority === "urgent").slice(0, 8), [filtered]);
  const transitionTask = async (activity: CrmActivity, nextState: ActivityState, dueAt?: string | null, updateDue = false) => { try { const runs = await transition.mutateAsync({ id: activity.id, state: nextState, dueAt, updateDue }); if (runs.length > 0) toast({ title: `${runs.length} automation${runs.length === 1 ? "" : "s"} ready for approval` }); } catch (error) { toast({ title: "Unable to move task", description: error instanceof Error ? error.message : undefined, variant: "destructive" }); } };
  const dropTask = (id: string, bucket: FocusBucket) => { const activity = data.find((item) => item.id === id); if (!activity) return; const nextState = bucket === "waiting" ? "waiting" : activity.status === "waiting" ? "planned" : activity.status; void transitionTask(activity, nextState, dueDateForBucket(bucket), true); };

  return <div className="space-y-4"><AdminPageHeader title="CRM Focus Desk" icon={Columns3}><Button size="sm" onClick={() => openDialog("createActivity", "1")}><PlusCircle className="mr-1 h-4 w-4" />New task</Button></AdminPageHeader>
    <Card className="overflow-hidden"><CardContent className="p-3"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex flex-wrap gap-2">{([{ value: "my_focus", label: "My Focus", icon: UserRound }, { value: "helping", label: "Helping With", icon: UsersRound }, { value: "overdue", label: "Overdue", icon: AlertTriangle }, { value: "all_team", label: "All Team", icon: MoreHorizontal }] as const).map(({ value, label, icon: Icon }) => <Button key={value} size="sm" variant={preset === value ? "default" : "outline"} onClick={() => setPreset(value)}><Icon className="mr-1 h-3.5 w-3.5" />{label}</Button>)}</div><div className="flex items-center gap-2"><Tabs value={view} onValueChange={(value) => setView(value as DeskView)}><TabsList><TabsTrigger value="board"><Columns3 className="mr-1 h-3.5 w-3.5" />Board</TabsTrigger><TabsTrigger value="calendar"><CalendarDays className="mr-1 h-3.5 w-3.5" />Calendar</TabsTrigger><TabsTrigger value="list"><List className="mr-1 h-3.5 w-3.5" />List</TabsTrigger></TabsList></Tabs></div></div>
      <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(120px,1fr))]"><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks or customers" /></div><Select value={owner} onValueChange={setOwner}><SelectTrigger><SelectValue placeholder="Any owner" /></SelectTrigger><SelectContent><SelectItem value="all">Any owner</SelectItem>{Object.entries(staffNames).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select><Select value={priority} onValueChange={(value) => setPriority(value as ActivityPriority | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any priority</SelectItem>{ACTIVITY_PRIORITIES.map((item) => <SelectItem key={item} value={item}>{PRIORITY_LABELS[item]}</SelectItem>)}</SelectContent></Select><Select value={state} onValueChange={(value) => setState(value as ActivityState | "open" | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="open">Open work</SelectItem><SelectItem value="all">All states</SelectItem>{ACTIVITY_STATES.map((item) => <SelectItem key={item} value={item}>{STATE_LABELS[item]}</SelectItem>)}</SelectContent></Select><Select value={activityType} onValueChange={setActivityType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Any activity</SelectItem>{ACTIVITY_TYPES.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent></Select><Select value={taskChannel} onValueChange={(value) => setTaskChannel(value as ActivityTaskChannel | "all")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All channels</SelectItem>{TASK_CHANNELS.map((item) => <SelectItem key={item} value={item}>{TASK_CHANNEL_LABELS[item]}</SelectItem>)}</SelectContent></Select></div>
    </CardContent></Card>
    {priorityShelf.length > 0 ? <section className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 to-background p-3 dark:border-amber-900 dark:from-amber-950/20"><div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /><h2 className="text-xs font-semibold uppercase tracking-wide">Priority shelf</h2><Badge variant="secondary" className="text-[10px]">{priorityShelf.length}</Badge></div><ScrollArea><div className="flex min-w-max gap-2 pb-1">{priorityShelf.map((activity) => <div key={activity.id} className="w-64"><TaskCard activity={activity} staffNames={staffNames} onOpen={() => setSelectedId(activity.id)} /></div>)}</div></ScrollArea></section> : null}
    {isLoading ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading Focus Desk…</div> : <div className="overflow-x-auto">{view === "board" ? <FocusBoard activities={filtered} staffNames={staffNames} onOpen={(activity) => setSelectedId(activity.id)} onDrop={dropTask} /> : view === "calendar" ? <CalendarView activities={filtered} onOpen={(activity) => setSelectedId(activity.id)} /> : <CompactList activities={filtered} staffNames={staffNames} onOpen={(activity) => setSelectedId(activity.id)} />}</div>}
    <TaskDetail activity={selected} staffNames={staffNames} onClose={() => setSelectedId(null)} onEdit={() => selected && openDialog("editActivity", selected.id)} onTransition={(nextState) => selected ? transitionTask(selected, nextState) : Promise.resolve()} />
  </div>;
};

export default CrmActivitiesPage;
