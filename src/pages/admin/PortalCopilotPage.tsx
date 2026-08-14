import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Loader2,
  Mail,
  Mic,
  MicOff,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  SendHorizontal,
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
  analyzeCopilotAttachments,
  decideCopilotAction,
  editCopilotAction,
  loadCopilotState,
  prepareErpRollout,
  type CopilotAction,
  type CopilotAttachment,
  type CopilotState,
} from "@/features/admin/copilot/api";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
const TEXT_TYPES = /^(text\/|application\/(json|csv|xml))/;

const toBase64 = async (file: Blob) => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let index = 0; index < buffer.length; index += 8192) {
    binary += String.fromCharCode(...buffer.subarray(index, index + 8192));
  }
  return btoa(binary);
};

const buildAttachment = async (file: File): Promise<CopilotAttachment> => {
  const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
  const mimeType = file.type || "application/octet-stream";
  if (TEXT_TYPES.test(mimeType)) {
    return { id, name: file.name, mimeType, kind: "text", text: (await file.text()).slice(0, 20000) };
  }
  const data = await toBase64(file);
  if (mimeType.startsWith("image/")) {
    return { id, name: file.name, mimeType, kind: "image", data, previewUrl: URL.createObjectURL(file) };
  }
  return { id, name: file.name || "document.pdf", mimeType: "application/pdf", kind: "pdf", data };
};

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  files?: { name: string; kind: CopilotAttachment["kind"]; previewUrl?: string }[];
};


const DEFAULT_COMMAND = "Roll out portal access to all ERP customers";
const SUGGESTIONS = [
  "Roll out portal access to all ERP customers",
  "Prepare portal invitations for Innovations customers without logins",
  "Show me which ERP customers still need a portal contact",
];

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
    <Card className={cn("overflow-hidden rounded-none shadow-none", action.status === "failed" && "border-red-300")}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            <div className={cn("mt-0.5 p-2", action.action_type === "send_portal_invite" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700")}>
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
          <div role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Action needs attention</p>
            <p className="mt-1">{action.last_error}</p>
            {partialAccountCreated ? <p className="mt-1 font-medium">The portal account remains created. Retry will only prepare a fresh secure link and queue the email.</p> : null}
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {action.action_type === "send_portal_invite" ? (
          <div className="space-y-3 border bg-muted/20 p-4">
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
          <div className="space-y-1.5 border bg-muted/20 p-4">
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
  const [command, setCommand] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [state, setState] = useState<CopilotState | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<"pending" | "resolved" | "all">("pending");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showAudit, setShowAudit] = useState(false);
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const usable = files.filter((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast({ title: "File too large", description: `${file.name} is over 8MB.`, variant: "destructive" });
        return false;
      }
      return true;
    });
    if (!usable.length) return;
    const built = await Promise.all(usable.map(buildAttachment));
    setAttachments((current) => [...current, ...built].slice(0, MAX_ATTACHMENTS));
  }, [toast]);


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
      setCommand("");
      setInputMode("text");
      setTranscriptConfirmed(false);
      setSpeechConfidence(null);
      setActionFilter("pending");
      toast({ title: "ERP rollout prepared", description: "No customer-facing action was executed. Review the action cards in the thread." });
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
  const pendingActions = useMemo(
    () => (displayedState?.actions ?? []).filter((action) => action.status === "pending_approval" || action.status === "failed"),
    [displayedState],
  );
  const resolvedActions = useMemo(
    () => (displayedState?.actions ?? []).filter((action) => action.status !== "pending_approval" && action.status !== "failed"),
    [displayedState],
  );
  const visibleActions = actionFilter === "pending" ? pendingActions : actionFilter === "resolved" ? resolvedActions : (displayedState?.actions ?? []);
  const lowConfidence = inputMode === "voice" && speechConfidence != null && speechConfidence < speech.settings.confidenceThreshold;
  const hasAttachments = attachments.length > 0;
  const canPrepare = !prepareMutation.isPending && !isAnalyzing
    && (hasAttachments || command.trim().length > 0)
    && (inputMode === "text" || transcriptConfirmed);
  const auditEvents = displayedState?.auditEvents ?? [];

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedRun?.id, visibleActions.length, prepareMutation.isPending, localMessages.length, isAnalyzing]);

  const chooseRun = (runId: string) => {
    setSelectedRunId(runId);
    setActionFilter("pending");
    void loadCopilotState(runId).then(acceptState).catch((error) => {
      toast({ title: "Could not load run", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    });
  };

  const startNewConversation = () => {
    setState(null);
    setSelectedRunId(undefined);
    setCommand("");
    setInputMode("text");
    setTranscriptConfirmed(false);
    setSpeechConfidence(null);
    setAttachments([]);
    setLocalMessages([]);
    setActionFilter("pending");
    void stateQuery.refetch();
  };

  const analyzeAttachments = async () => {
    const pending = attachments;
    const text = command.trim();
    setLocalMessages((current) => [...current, {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      files: pending.map((file) => ({ name: file.name, kind: file.kind, previewUrl: file.previewUrl })),
    }]);
    setCommand("");
    setAttachments([]);
    setInputMode("text");
    setIsAnalyzing(true);
    try {
      const reply = await analyzeCopilotAttachments({ message: text, attachments: pending });
      setLocalMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: reply }]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "The Copilot could not read that file.";
      setLocalMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", text: messageText }]);
      toast({ title: "Could not read the attachment", description: messageText, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submit = () => {
    if (!canPrepare) return;
    if (hasAttachments) {
      void analyzeAttachments();
      return;
    }
    prepareMutation.mutate();
  };


  return (
    <div
      className="relative flex h-[calc(100vh-4rem)] w-full overflow-hidden border-t bg-background"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setIsDragging(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setIsDragging(false);
        void addFiles(Array.from(event.dataTransfer.files));
      }}
    >
      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-cyan-500 bg-background/85">
          <p className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" /> Drop a prescription or order file to attach it</p>
        </div>
      ) : null}
      {showSidebar ? (
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/30 lg:flex">
          <div className="flex items-center justify-between gap-2 border-b p-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-cyan-600" /> Portal Copilot</span>
            <Button size="icon" variant="ghost" aria-label="Hide run history" onClick={() => setShowSidebar(false)}><PanelLeftClose className="h-4 w-4" /></Button>
          </div>
          <div className="p-3">
            <Button variant="outline" className="w-full justify-start rounded-none" onClick={startNewConversation}>
              <Plus className="mr-2 h-4 w-4" /> New conversation
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recent runs</p>
            {(displayedState?.runs ?? []).map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => chooseRun(run.id)}
                className={cn(
                  "w-full border border-transparent px-3 py-2 text-left transition-colors hover:bg-muted",
                  run.id === displayedState?.selectedRunId && "border-border bg-background",
                )}
              >
                <p className="line-clamp-2 text-sm">{run.command_text}</p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {new Date(run.created_at).toLocaleString()}</p>
              </button>
            ))}
            {!displayedState?.runs.length ? <p className="px-1 text-xs text-muted-foreground">No runs yet.</p> : null}
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-4 py-3">
          {!showSidebar ? (
            <Button size="icon" variant="ghost" aria-label="Show run history" className="hidden lg:inline-flex" onClick={() => setShowSidebar(true)}><PanelLeftOpen className="h-4 w-4" /></Button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">CV Portal Copilot</h1>
            <p className="truncate text-xs text-muted-foreground">Admin only · prepares safe actions, never sends without approval</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-none" onClick={startNewConversation}>
              <Plus className="mr-2 h-4 w-4" /> New chat
            </Button>
            <Badge variant="outline" className="hidden gap-1 md:inline-flex"><ShieldCheck className="h-3 w-3" /> Level 2 prepare</Badge>
            <Badge variant="outline" className="hidden gap-1 md:inline-flex"><Database className="h-3 w-3" /> Innovations sync</Badge>
          </div>

        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
            {stateQuery.isError && !state ? (
              <div className="flex gap-3 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Copilot backend is not available in this environment.</p>
                  <p className="mt-1">Apply the Portal Copilot migration and deploy the portal-copilot, admin-user-management, docstudio-api and mcp functions.</p>
                </div>
              </div>
            ) : null}

            {!selectedRun && !localMessages.length ? (
              <div className="flex flex-col items-center py-16 text-center">
                <div className="bg-slate-900 p-3 text-white"><Bot className="h-6 w-6 text-cyan-300" /></div>
                <h2 className="mt-4 text-xl font-semibold">What should I take care of?</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">Ask in plain English, hold the mic, or drop in a prescription or order file. I query the live Innovations-synced customer layer, prepare portal actions, and wait for your approval before anything customer-facing happens.</p>

                <div className="mt-6 grid w-full max-w-xl gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="border px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
                      onClick={() => {
                        setCommand(suggestion);
                        setInputMode("text");
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedRun ? (
              <>

                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary px-4 py-3 text-sm text-primary-foreground">{selectedRun.command_text}</div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-1 h-7 w-7 shrink-0 bg-slate-900 p-1.5 text-white"><Bot className="h-4 w-4 text-cyan-300" /></div>
                  <div className="min-w-0 flex-1 space-y-4">
                    <p className="text-sm leading-6">
                      I reviewed <strong>{selectedRun.summary.erpCustomers ?? 0}</strong> ERP customers. <strong>{selectedRun.summary.alreadyActive ?? 0}</strong> already have portal access,
                      {" "}<strong>{selectedRun.summary.invitationsReady ?? 0}</strong> invitations are drafted and waiting for your approval, and <strong>{selectedRun.summary.followUpsNeeded ?? 0}</strong> customers need a follow-up before I can invite anyone.
                      {" "}Nothing customer-facing has been sent.
                    </p>

                    {displayedState?.actions.length ? (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                          {([["pending", `Needs approval (${pendingActions.length})`], ["resolved", `Resolved (${resolvedActions.length})`], ["all", `All (${displayedState.actions.length})`]] as const).map(([value, label]) => (
                            <Button key={value} type="button" size="sm" className="rounded-none" variant={actionFilter === value ? "default" : "outline"} onClick={() => setActionFilter(value)}>
                              {label}
                            </Button>
                          ))}
                        </div>
                        {visibleActions.length ? visibleActions.map((action) => (
                          <ActionCard
                            key={`${action.id}:${action.updated_at}`}
                            action={action}
                            busy={busyActionId === action.id}
                            onDecide={(selected, decision) => decideMutation.mutate({ action: selected, decision })}
                            onSave={(selected, draft) => editMutation.mutate({ action: selected, draft })}
                          />
                        )) : (
                          <div className="flex flex-col items-center border py-10 text-center">
                            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                            <p className="mt-3 font-medium">Nothing in this view.</p>
                            <p className="mt-1 text-sm text-muted-foreground">Switch filters to see the rest of this run.</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center border py-10 text-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                        <p className="mt-3 font-medium">No actions need approval for this run.</p>
                        <p className="mt-1 text-sm text-muted-foreground">All synced ERP customers already have access, or the run completed without proposed changes.</p>
                      </div>
                    )}

                    <div className="border">
                      <button type="button" className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium hover:bg-muted" onClick={() => setShowAudit((open) => !open)} aria-expanded={showAudit}>
                        <span className="flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Audit trail ({auditEvents.length})</span>
                        <span className="text-xs text-muted-foreground">{showAudit ? "Hide" : "Show"}</span>
                      </button>
                      {showAudit ? (
                        <div className="space-y-3 border-t p-4">
                          {auditEvents.length ? auditEvents.map((event) => (
                            <div key={event.id} className="border p-3 text-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-medium">{statusLabel(event.event_type)}</span>
                                <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                              </div>
                              {event.transcript ? <p className="mt-2 bg-muted/50 p-2 text-xs"><span className="font-medium">Transcript:</span> {event.transcript}</p> : null}
                              {Object.keys(event.metadata ?? {}).length ? (
                                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words bg-slate-950 p-2 text-[11px] text-slate-100">{JSON.stringify(event.metadata, null, 2)}</pre>
                              ) : null}
                              <p className="mt-2 text-[11px] text-muted-foreground">Actor {event.actor_user_id ?? "system"}{event.action_id ? ` · Action ${event.action_id}` : ""}</p>
                            </div>
                          )) : <p className="text-sm text-muted-foreground">No audit events have been recorded for this run yet.</p>}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {localMessages.map((message) => (
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] space-y-2 bg-primary px-4 py-3 text-sm text-primary-foreground">
                    {message.text ? <p className="whitespace-pre-wrap">{message.text}</p> : null}
                    {message.files?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {message.files.map((file) => (
                          file.kind === "image" && file.previewUrl ? (
                            <img key={file.name} src={file.previewUrl} alt={file.name} className="h-20 w-20 border border-primary-foreground/30 object-cover" />
                          ) : (
                            <span key={file.name} className="flex items-center gap-1 border border-primary-foreground/30 px-2 py-1 text-xs">
                              <FileText className="h-3 w-3" /> {file.name}
                            </span>
                          )
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex gap-3">
                  <div className="mt-1 h-7 w-7 shrink-0 bg-slate-900 p-1.5 text-white"><Bot className="h-4 w-4 text-cyan-300" /></div>
                  <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                </div>
              )
            ))}

            {isAnalyzing ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-7 w-7 shrink-0 bg-slate-900 p-1.5 text-white"><Bot className="h-4 w-4 animate-pulse text-cyan-300" /></div>
                Reading your attachment…
              </div>
            ) : null}

            {prepareMutation.isPending ? (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="h-7 w-7 shrink-0 bg-slate-900 p-1.5 text-white"><Bot className="h-4 w-4 animate-pulse text-cyan-300" /></div>
                Working through the ERP customer layer…
              </div>
            ) : null}

            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="border-t bg-background">
          <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-4">
            {inputMode === "voice" ? (
              <div className={cn("border p-3 text-sm", lowConfidence ? "border-amber-300 bg-amber-50" : "border-sky-200 bg-sky-50")}>
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

            <div className="flex items-end gap-2 border p-2">
              <Textarea
                aria-label="Message the Copilot"
                value={command}
                onChange={(event) => {
                  setCommand(event.target.value);
                  if (inputMode === "voice") setTranscriptConfirmed(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                className="max-h-40 min-h-10 resize-none border-0 bg-transparent p-2 text-base shadow-none focus-visible:ring-0"
                placeholder={`Message Copilot — e.g. "${DEFAULT_COMMAND}"`}
              />
              <Button
                type="button"
                size="icon"
                variant={speech.isListening ? "destructive" : "ghost"}
                className="rounded-none"
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
                {speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button type="button" size="icon" className="rounded-none" aria-label="Prepare safe actions" disabled={!canPrepare} onClick={submit}>
                {prepareMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setShowAudioSettings((open) => !open)} aria-expanded={showAudioSettings}>
                <Settings2 className="h-3.5 w-3.5" /> Audio settings
              </button>
              <span className="truncate">{speech.activeDeviceLabel}</span>
              <div className="h-1.5 w-24 overflow-hidden bg-muted"><div className="h-full bg-cyan-500 transition-[width]" style={{ width: `${speech.level}%` }} /></div>
              {speech.isTranscribing ? <span>Transcribing your recording…</span> : null}
              <span className="ml-auto hidden sm:inline">Enter to send · Shift+Enter for a new line</span>
            </div>
            {speech.error ? <p role="alert" className="text-sm text-red-700">{speech.error}</p> : null}

            {showAudioSettings ? (
              <div className="grid gap-4 border bg-muted/20 p-4 md:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalCopilotPage;
