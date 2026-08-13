import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  FileCheck2,
  Loader2,
  Mail,
  Mic,
  MicOff,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  UserRoundSearch,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  decideCopilotAction,
  editCopilotAction,
  loadCopilotState,
  prepareErpRollout,
  type CopilotAction,
  type CopilotState,
} from "@/features/admin/copilot/api";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";
import { cn } from "@/lib/utils";

const DEFAULT_COMMAND = "Roll out portal access to all ERP customers";

const statusLabel = (status: string) => status.replaceAll("_", " ");
const statusTone = (status: string) => {
  if (status === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "failed" || status === "partial" || status === "blocked") return "border-red-200 bg-red-50 text-red-800";
  if (status === "rejected") return "border-slate-200 bg-slate-50 text-slate-700";
  if (status === "executing" || status === "preparing") return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
};

type ActionCardProps = {
  action: CopilotAction;
  busy: boolean;
  onDecide: (action: CopilotAction, decision: "approve" | "reject") => void;
  onSave: (action: CopilotAction, draft: { subject?: string; body?: string; taskContent?: string }) => void;
};

const ActionCard = ({ action, busy, onDecide, onSave }: ActionCardProps) => {
  const [subject, setSubject] = useState(action.payload.subject ?? "");
  const [body, setBody] = useState(action.payload.body ?? "");
  const [taskContent, setTaskContent] = useState(action.payload.taskContent ?? "");
  const canAct = action.status === "pending_approval" || action.status === "failed";

  const changed = action.action_type === "send_portal_invite"
    ? subject !== (action.payload.subject ?? "") || body !== (action.payload.body ?? "")
    : taskContent !== (action.payload.taskContent ?? "");
  const partialAccountCreated = action.result?.portalAccountCreated === true && action.result?.emailQueued === false;

  return (
    <Card className={cn("overflow-hidden shadow-none", action.status === "failed" && "border-red-300")}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className={cn("mt-0.5 rounded-lg p-2", action.action_type === "send_portal_invite" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>
              {action.action_type === "send_portal_invite" ? <Mail className="h-4 w-4" /> : <UserRoundSearch className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">{action.title}</CardTitle>
              <CardDescription className="mt-1">{action.summary}</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusTone(action.status)}>{statusLabel(action.status)}</Badge>
            <Badge variant="outline">Level {action.risk_level}</Badge>
          </div>
        </div>
        {action.last_error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Action needs attention</p>
            <p className="mt-1">{action.last_error}</p>
            {partialAccountCreated ? <p className="mt-1 font-medium">The portal account remains created. Retry will only prepare a fresh secure link and queue the email.</p> : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {action.action_type === "send_portal_invite" ? (
          <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
            <div className="grid gap-1 text-sm sm:grid-cols-[7rem_1fr]"><span className="text-muted-foreground">Recipient</span><span>{action.payload.recipientName} &lt;{action.payload.recipientEmail}&gt;</span></div>
            <div className="grid gap-1 text-sm sm:grid-cols-[7rem_1fr]"><span className="text-muted-foreground">Template rule</span><span>{action.payload.templateName}</span></div>
            <div className="space-y-1.5">
              <Label htmlFor={`subject-${action.id}`}>Subject</Label>
              <Input id={`subject-${action.id}`} value={subject} onChange={(event) => setSubject(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`body-${action.id}`}>Email draft</Label>
              <Textarea id={`body-${action.id}`} value={body} onChange={(event) => setBody(event.target.value)} rows={6} />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5 rounded-lg border bg-muted/20 p-4">
            <Label htmlFor={`task-${action.id}`}>Internal follow-up task</Label>
            <Textarea id={`task-${action.id}`} value={taskContent} onChange={(event) => setTaskContent(event.target.value)} rows={4} />
          </div>
        )}

        {canAct ? (
          <div className="flex flex-wrap items-center gap-2">
            {changed ? (
              <Button variant="outline" disabled={busy} onClick={() => onSave(action, action.action_type === "send_portal_invite" ? { subject, body } : { taskContent })}>
                <Save className="mr-2 h-4 w-4" /> Save edit
              </Button>
            ) : null}
            <Button disabled={busy || changed} onClick={() => onDecide(action, "approve")}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : action.status === "failed" ? <RotateCcw className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
              {action.status === "failed" ? "Retry approved action" : action.action_type === "send_portal_invite" ? "Approve & send" : "Approve task"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => onDecide(action, "reject")}>
              <X className="mr-2 h-4 w-4" /> Reject
            </Button>
            {changed ? <span className="text-xs text-amber-700">Save the edit before approval.</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const PortalCopilotPage = () => {
  const { toast } = useToast();
  const [command, setCommand] = useState(DEFAULT_COMMAND);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [state, setState] = useState<CopilotState | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const onTranscript = useCallback((transcript: string, confidence: number) => {
    setCommand(transcript);
    setInputMode("voice");
    setTranscriptConfirmed(false);
    setSpeechConfidence(confidence);
  }, []);
  const speech = usePushToTalk(onTranscript);

  const stateQuery = useQuery({
    queryKey: ["portal-copilot-state", selectedRunId ?? "latest"],
    queryFn: () => loadCopilotState(selectedRunId),
    retry: false,
  });
  const acceptState = useCallback((next: CopilotState) => {
    setState(next);
    setSelectedRunId(next.selectedRunId ?? undefined);
  }, []);

  const prepareMutation = useMutation({
    mutationFn: () => prepareErpRollout({ command, inputMode, transcriptConfirmed }),
    onSuccess: (next) => {
      acceptState(next);
      toast({ title: "ERP rollout prepared", description: "No customer-facing action was executed. Review the action cards below." });
    },
    onError: (error: Error) => toast({ title: "Could not prepare rollout", description: error.message, variant: "destructive" }),
  });

  const decideMutation = useMutation({
    mutationFn: ({ action, decision }: { action: CopilotAction; decision: "approve" | "reject" }) => decideCopilotAction(action.id, decision),
    onMutate: ({ action }) => setBusyActionId(action.id),
    onSuccess: (next) => acceptState(next),
    onError: (error: Error) => toast({ title: "Action needs attention", description: error.message, variant: "destructive" }),
    onSettled: () => setBusyActionId(null),
  });

  const editMutation = useMutation({
    mutationFn: ({ action, draft }: { action: CopilotAction; draft: { subject?: string; body?: string; taskContent?: string } }) => editCopilotAction(action, draft),
    onMutate: ({ action }) => setBusyActionId(action.id),
    onSuccess: (next) => {
      acceptState(next);
      toast({ title: "Action draft updated" });
    },
    onError: (error: Error) => toast({ title: "Could not save edit", description: error.message, variant: "destructive" }),
    onSettled: () => setBusyActionId(null),
  });

  const displayedState = state ?? stateQuery.data ?? null;
  const selectedRun = useMemo(
    () => displayedState?.runs.find((run) => run.id === displayedState.selectedRunId) ?? displayedState?.runs[0] ?? null,
    [displayedState],
  );
  const lowConfidence = inputMode === "voice" && speechConfidence != null && speechConfidence < speech.settings.confidenceThreshold;
  const canPrepare = command.trim().length > 0 && !prepareMutation.isPending && (inputMode === "text" || transcriptConfirmed);

  const chooseRun = (runId: string) => {
    setSelectedRunId(runId);
    void loadCopilotState(runId).then(acceptState).catch((error) => {
      toast({ title: "Could not load run", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 p-4 md:p-6">
      <section className="overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 text-white shadow-sm">
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:p-8">
          <div className="max-w-3xl">
            <Badge className="mb-4 border-white/15 bg-white/10 text-white hover:bg-white/10">Admin only · ERP rollout MVP</Badge>
            <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl"><Bot className="h-7 w-7 text-cyan-300" /> CV Portal Copilot</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">Take care of everything safe, then show me what needs approval. V1 queries the live Innovations-synced customer layer, prepares portal actions, and records every decision.</p>
          </div>
          <div className="grid min-w-60 grid-cols-2 gap-2 self-start text-xs">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3"><ShieldCheck className="mb-2 h-4 w-4 text-emerald-300" /><span className="block text-slate-400">Autonomy</span><strong>Level 2 prepare</strong></div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3"><Database className="mb-2 h-4 w-4 text-cyan-300" /><span className="block text-slate-400">Action API</span><strong>Classic Visions MCP</strong></div>
          </div>
        </div>
      </section>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">What should I take care of?</CardTitle>
          <CardDescription>Type naturally or use push-to-talk. Voice is always shown as an editable transcript before anything is prepared.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            aria-label="Copilot command"
            value={command}
            onChange={(event) => {
              setCommand(event.target.value);
              if (inputMode === "voice") setTranscriptConfirmed(false);
            }}
            rows={4}
            className="resize-y text-base"
            placeholder={DEFAULT_COMMAND}
          />

          {inputMode === "voice" ? (
            <div className={cn("rounded-lg border p-3 text-sm", lowConfidence ? "border-amber-300 bg-amber-50" : "border-sky-200 bg-sky-50")}>
              <div className="flex items-start gap-2">
                {lowConfidence ? <AlertCircle className="mt-0.5 h-4 w-4 text-amber-700" /> : <FileCheck2 className="mt-0.5 h-4 w-4 text-sky-700" />}
                <div>
                  <p className="font-medium">Transcript review required</p>
                  <p className="text-muted-foreground">{lowConfidence ? "Recognition confidence was below your threshold. Correct any customer or lens terms before confirming." : "Edit any recognition errors, then confirm this is what you said."}</p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2 font-medium">
                    <Checkbox checked={transcriptConfirmed} onCheckedChange={(checked) => setTranscriptConfirmed(checked === true)} />
                    I reviewed this transcript
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={speech.isListening ? "destructive" : "outline"}
              aria-label="Hold to talk, then release to review the transcript"
              onPointerDown={(event) => {
                event.preventDefault();
                event.currentTarget.setPointerCapture(event.pointerId);
                void speech.start();
              }}
              onPointerUp={speech.stop}
              onPointerCancel={speech.stop}
              onKeyDown={(event) => {
                if ((event.key === " " || event.key === "Enter") && !event.repeat) {
                  event.preventDefault();
                  void speech.start();
                }
              }}
              onKeyUp={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  speech.stop();
                }
              }}
              onClick={(event) => event.preventDefault()}
            >
              {speech.isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {speech.isListening ? "Release to review" : "Hold to talk"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowAudioSettings((open) => !open)} aria-expanded={showAudioSettings}>
              <Settings2 className="mr-2 h-4 w-4" /> Audio settings
            </Button>
            <div className="min-w-36 flex-1 md:max-w-72">
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground"><span className="truncate">{speech.activeDeviceLabel}</span><span>{speech.level}%</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-cyan-500 transition-[width]" style={{ width: `${speech.level}%` }} /></div>
            </div>
            <div className="ml-auto">
              <Button size="lg" disabled={!canPrepare} onClick={() => prepareMutation.mutate()}>
                {prepareMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                Prepare safe actions
              </Button>
            </div>
          </div>
          {speech.error ? <p role="alert" className="text-sm text-red-700">{speech.error}</p> : null}

          {showAudioSettings ? (
            <div className="grid gap-4 rounded-xl border bg-muted/20 p-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Microphone</Label>
                <Select value={speech.settings.deviceId} onValueChange={(deviceId) => speech.setSettings((current) => ({ ...current, deviceId }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">System default</SelectItem>
                    {speech.devices.filter((device) => device.deviceId && device.deviceId !== "default").map((device, index) => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select value={speech.settings.language} onValueChange={(language: "en-BB" | "en-US" | "en-GB") => speech.setSettings((current) => ({ ...current, language }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="en-BB">English (Caribbean)</SelectItem><SelectItem value="en-US">English (US)</SelectItem><SelectItem value="en-GB">English (UK)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="silence-timeout">Silence timeout (ms)</Label>
                <Input id="silence-timeout" type="number" min={500} max={5000} step={250} value={speech.settings.silenceTimeoutMs} onChange={(event) => speech.setSettings((current) => ({ ...current, silenceTimeoutMs: Number(event.target.value) || 1500 }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confidence-threshold">Confidence threshold</Label>
                <Input id="confidence-threshold" type="number" min={0} max={1} step={0.05} value={speech.settings.confidenceThreshold} onChange={(event) => speech.setSettings((current) => ({ ...current, confidenceThreshold: Math.min(1, Math.max(0, Number(event.target.value))) }))} />
              </div>
              <div className="space-y-1.5 md:col-span-2 lg:col-span-4">
                <Label htmlFor="custom-vocabulary">Customer and lens vocabulary</Label>
                <Input id="custom-vocabulary" value={speech.settings.vocabulary} onChange={(event) => speech.setSettings((current) => ({ ...current, vocabulary: event.target.value }))} />
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {stateQuery.isError && !state ? (
        <Card className="border-amber-300 bg-amber-50 shadow-none">
          <CardContent className="flex gap-3 p-5 text-sm text-amber-950"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-medium">Copilot backend is not available in this environment.</p><p className="mt-1">Apply the Portal Copilot migration and deploy the `portal-copilot`, `admin-user-management`, `docstudio-api`, and regenerated `mcp` functions.</p></div></CardContent>
        </Card>
      ) : null}

      {displayedState?.runs.length ? (
        <div className="grid min-h-0 gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <Card className="h-fit shadow-none">
            <CardHeader><CardTitle className="text-base">Recent runs</CardTitle><CardDescription>Durable rollout history</CardDescription></CardHeader>
            <CardContent className="space-y-2">
              {displayedState.runs.map((run) => (
                <button key={run.id} type="button" onClick={() => chooseRun(run.id)} className={cn("w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50", run.id === displayedState.selectedRunId && "border-cyan-400 bg-cyan-50/60")}>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">ERP rollout</span><Badge variant="outline" className={cn("text-[10px]", statusTone(run.status))}>{statusLabel(run.status)}</Badge></div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium">{run.command_text}</p>
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {new Date(run.created_at).toLocaleString()}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {selectedRun ? (
              <Card className="shadow-none">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div><p className="text-xs text-muted-foreground">ERP customers</p><p className="text-xl font-semibold">{selectedRun.summary.erpCustomers ?? 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Already active</p><p className="text-xl font-semibold">{selectedRun.summary.alreadyActive ?? 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Invites ready</p><p className="text-xl font-semibold">{selectedRun.summary.invitationsReady ?? 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Follow-ups</p><p className="text-xl font-semibold">{selectedRun.summary.followUpsNeeded ?? 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Source</p><p className="mt-1 flex items-center gap-1 text-sm font-medium"><Database className="h-3.5 w-3.5" /> Innovations sync</p></div>
                </CardContent>
              </Card>
            ) : null}

            {displayedState.actions.length ? displayedState.actions.map((action) => (
              <ActionCard
                key={`${action.id}:${action.updated_at}`}
                action={action}
                busy={busyActionId === action.id}
                onDecide={(selected, decision) => decideMutation.mutate({ action: selected, decision })}
                onSave={(selected, draft) => editMutation.mutate({ action: selected, draft })}
              />
            )) : (
              <Card className="shadow-none"><CardContent className="flex flex-col items-center justify-center py-12 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-600" /><p className="mt-3 font-medium">No actions need approval for this run.</p><p className="mt-1 text-sm text-muted-foreground">All synced ERP customers already have access, or the run completed without proposed changes.</p></CardContent></Card>
            )}

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Audit trail</CardTitle>
                <CardDescription>Commands, decisions, execution results, and failures for this run.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(displayedState.auditEvents ?? []).length ? (displayedState.auditEvents ?? []).map((event) => (
                  <div key={event.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{statusLabel(event.event_type)}</span>
                      <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                    </div>
                    {event.transcript ? <p className="mt-2 rounded bg-muted/50 p-2 text-xs"><span className="font-medium">Transcript:</span> {event.transcript}</p> : null}
                    {Object.keys(event.metadata ?? {}).length ? (
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded bg-slate-950 p-2 text-[11px] text-slate-100">{JSON.stringify(event.metadata, null, 2)}</pre>
                    ) : null}
                    <p className="mt-2 text-[11px] text-muted-foreground">Actor {event.actor_user_id ?? "system"}{event.action_id ? ` · Action ${event.action_id}` : ""}</p>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No audit events have been recorded for this run yet.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PortalCopilotPage;
