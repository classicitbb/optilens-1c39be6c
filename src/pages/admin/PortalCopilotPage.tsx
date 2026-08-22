import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowUp,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Loader2,
  Mic,
  MicOff,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  analyzeCopilotAttachments,
  createCopilotConversation,
  decideCopilotAction,
  editCopilotAction,
  loadCopilotState,
  submitCopilotCommand,
  type CopilotAction,
  type CopilotAttachment,
  type CopilotState,
} from "@/features/admin/copilot/api";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";
import { CopilotMarkdown } from "@/features/admin/copilot/CopilotMarkdown";
import { ActionCard, statusLabel } from "@/features/admin/copilot/ActionCard";
import { ThinkingDots } from "@/features/admin/copilot/ThinkingDots";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, buildAttachment } from "@/features/admin/copilot/attachments";
import { cn } from "@/lib/utils";

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  files?: { name: string; kind: CopilotAttachment["kind"]; previewUrl?: string }[];
};


const DEFAULT_COMMAND = "Roll out portal access to all ERP customers";
const SUGGESTIONS = [
  "Scan CRM for lapsed buyers and qualified follow-up opportunities",
  "Roll out portal access to all ERP customers",
  "Prepare portal invitations for Innovations customers without logins",
  "Show me which ERP customers still need a portal contact",
];

const PortalCopilotPage = () => {
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [holdToRecord, setHoldToRecord] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
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
    queryKey: ["portal-copilot-state", selectedConversationId ?? "latest", selectedRunId ?? "latest"],
    queryFn: () => loadCopilotState(selectedConversationId, selectedRunId),
    retry: false,
  });
  const acceptState = useCallback((next: CopilotState) => {
    setState(next);
    setSelectedConversationId(next.selectedConversationId ?? undefined);
    setSelectedRunId(next.selectedRunId ?? undefined);
  }, []);

  const prepareMutation = useMutation({
    mutationFn: () => submitCopilotCommand({
      command,
      inputMode,
      transcriptConfirmed,
      conversationId: selectedConversationId ?? stateQuery.data?.selectedConversationId ?? undefined,
    }),
    onSuccess: (next) => {
      acceptState(next);
      setCommand("");
      setInputMode("text");
      setTranscriptConfirmed(false);
      setSpeechConfidence(null);
      setActionFilter("pending");
      const preparedRun = next.runs.find((run) => run.id === next.selectedRunId);
      toast(preparedRun?.workflow === "crm_opportunity_scan"
        ? { title: "CRM recommendations prepared", description: "No CRM record was changed. Review and approve individual tasks." }
        : preparedRun?.workflow === "erp_portal_rollout"
          ? { title: "ERP rollout prepared", description: "No customer-facing action was executed. Review the action cards in the thread." }
          : { title: "Copilot replied" });
    },
    onError: (error: Error) => toast({ title: "Could not prepare rollout", description: error.message, variant: "destructive" }),
  });

  const newConversationMutation = useMutation({
    mutationFn: createCopilotConversation,
    onSuccess: (next) => {
      acceptState(next);
      setCommand("");
      setInputMode("text");
      setTranscriptConfirmed(false);
      setSpeechConfidence(null);
      setAttachments([]);
      setLocalMessages([]);
      setActionFilter("pending");
    },
    onError: (error: Error) => toast({ title: "Could not start a new chat", description: error.message, variant: "destructive" }),
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
  const selectedConversation = useMemo(
    () => (displayedState?.conversations ?? []).find((conversation) => conversation.id === displayedState?.selectedConversationId) ?? null,
    [displayedState],
  );
  const conversationMessages = useMemo(() => displayedState?.messages ?? [], [displayedState]);
  const selectedRun = useMemo(
    () => displayedState?.selectedRunId
      ? displayedState.runs.find((run) => run.id === displayedState.selectedRunId) ?? null
      : null,
    [displayedState],
  );
  const visibleConversationMessages = useMemo(
    () => conversationMessages.filter((message) => !selectedRun || message.content !== selectedRun.command_text),
    [conversationMessages, selectedRun],
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
  }, [selectedConversation?.id, selectedRun?.id, visibleActions.length, prepareMutation.isPending, conversationMessages.length, localMessages.length, isAnalyzing]);

  const chooseConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setSelectedRunId(undefined);
    setLocalMessages([]);
    setCommand("");
    setAttachments([]);
    setActionFilter("pending");
    void loadCopilotState(conversationId).then(acceptState).catch((error) => {
      toast({ title: "Could not load chat", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    });
  };

  const startNewConversation = () => {
    newConversationMutation.mutate();
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
      const next = await analyzeCopilotAttachments({
        message: text,
        attachments: pending,
        conversationId: selectedConversationId ?? stateQuery.data?.selectedConversationId ?? undefined,
      });
      setLocalMessages([]);
      acceptState(next);
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
          <div className="flex items-center justify-between gap-1.5 border-b px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold"><Bot className="h-3.5 w-3.5 text-cyan-600" /> Portal Copilot</span>
            <Button size="icon" variant="ghost" className="h-6 w-6" aria-label="Hide chat history" onClick={() => setShowSidebar(false)}><PanelLeftClose className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="px-2 py-1.5">
            <Button variant="outline" className="h-7 w-full justify-start rounded-sm text-xs" disabled={newConversationMutation.isPending} onClick={startNewConversation}>
              {newConversationMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} New chat
            </Button>
          </div>

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
            <p className="px-1 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Chats</p>
            {(displayedState?.conversations ?? []).map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => chooseConversation(conversation.id)}
                className={cn(
                  "group w-full border-l-2 border-transparent px-2 py-1.5 text-left text-xs transition-all duration-200 hover:translate-x-0.5 hover:bg-muted",
                  conversation.id === displayedState?.selectedConversationId && "border-l-cyan-500 bg-background shadow-sm",
                )}
              >
                <p className={cn("line-clamp-2 transition-colors", conversation.id === displayedState?.selectedConversationId ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{conversation.title}</p>
                <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground"><Clock3 className="h-2.5 w-2.5" /> {new Date(conversation.updated_at).toLocaleString()}</p>
              </button>
            ))}

            {!(displayedState?.conversations ?? []).length ? <p className="px-1 text-[11px] text-muted-foreground">No chats yet.</p> : null}
          </div>
        </aside>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-4 py-2">
          {!showSidebar ? (
            <Button size="icon" variant="ghost" aria-label="Show chat history" className="hidden h-7 w-7 lg:inline-flex" onClick={() => setShowSidebar(true)}><PanelLeftOpen className="h-3.5 w-3.5" /></Button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-xs font-semibold">{selectedConversation?.title ?? "CV Portal Copilot"}</h1>
            <p className="truncate text-[11px] text-muted-foreground">Your operational conversation · live changes always need approval</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-7 rounded-sm text-xs" disabled={newConversationMutation.isPending} onClick={startNewConversation}>
              {newConversationMutation.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />} New chat
            </Button>
            <Badge variant="outline" className="hidden gap-0.5 text-[10px] md:inline-flex"><ShieldCheck className="h-2.5 w-2.5" /> Approval protected</Badge>
            <Badge variant="outline" className="hidden gap-0.5 text-[10px] md:inline-flex"><Database className="h-2.5 w-2.5" /> CRM + ERP context</Badge>
          </div>

        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-3">
            {stateQuery.isError && !state ? (
              <div className="flex gap-2 border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Copilot backend is not available in this environment.</p>
                  <p className="mt-0.5 text-[11px]">Apply the Portal Copilot migration and deploy the portal-copilot, admin-user-management, docstudio-api and mcp functions.</p>
                </div>
              </div>
            ) : null}

            {!selectedRun && !conversationMessages.length && !localMessages.length ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="bg-slate-900 p-2 text-white"><Bot className="h-5 w-5 text-cyan-300" /></div>
                <h2 className="mt-3 text-lg font-semibold">What can I help you with?</h2>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">Ask a question or give me a task. I’ll surface what I know and turn approved steps into governed actions.</p>

                <div className="mt-4 grid w-full max-w-xl gap-1.5">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="border px-3 py-2 text-left text-xs transition-colors hover:bg-muted"
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
                  <div className="max-w-[85%] bg-primary px-3 py-2 text-xs text-primary-foreground">{selectedRun.command_text}</div>
                </div>

                <div className="flex gap-2">
                  <div className="mt-0.5 h-6 w-6 shrink-0 bg-slate-900 p-1 text-white"><Bot className="h-3.5 w-3.5 text-cyan-300" /></div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {selectedRun.workflow === "crm_opportunity_scan" ? (
                      <div className="space-y-1 text-xs leading-5">
                        <p>
                          I reviewed <strong>{selectedRun.summary.contactsReviewed ?? 0}</strong> pipeline contacts and <strong>{selectedRun.summary.orderSignalsReviewed ?? 0}</strong> order-health records.
                          {" "}<strong>{selectedRun.summary.suggestionsPrepared ?? 0}</strong> qualified follow-up tasks are ready for review.
                        </p>
                        <p className="text-muted-foreground">
                          Signals: {selectedRun.summary.lapsedBuyers ?? 0} lapsed buyers · {selectedRun.summary.overdueNextActions ?? 0} overdue next actions · {selectedRun.summary.missingContactDetails ?? 0} incomplete contacts · {selectedRun.summary.noActiveOpportunity ?? 0} opportunity reviews. No CRM task or opportunity has been created yet.
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs leading-5">
                        I reviewed <strong>{selectedRun.summary.erpCustomers ?? 0}</strong> ERP customers. <strong>{selectedRun.summary.alreadyActive ?? 0}</strong> already have portal access,
                        {" "}<strong>{selectedRun.summary.invitationsReady ?? 0}</strong> invitations are drafted and waiting for your approval, and <strong>{selectedRun.summary.followUpsNeeded ?? 0}</strong> customers need a follow-up before I can invite anyone.
                        {" "}Nothing customer-facing has been sent.
                      </p>
                    )}

                    {(displayedState?.actions ?? []).length ? (
                      <>
                        <div className="flex flex-wrap items-center gap-1">
                          {([["pending", `Needs approval (${pendingActions.length})`], ["resolved", `Resolved (${resolvedActions.length})`], ["all", `All (${displayedState.actions.length})`]] as const).map(([value, label]) => (
                            <Button key={value} type="button" size="sm" className="h-6 rounded-sm text-xs" variant={actionFilter === value ? "default" : "outline"} onClick={() => setActionFilter(value)}>
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
                          <div className="flex flex-col items-center border py-6 text-center">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <p className="mt-2 text-xs font-medium">Nothing in this view.</p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">Switch filters to see the rest of this run.</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center border py-6 text-center">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        <p className="mt-2 text-xs font-medium">No actions need approval for this run.</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{selectedRun.workflow === "crm_opportunity_scan" ? "No contact met the qualified-suggestion rules, or existing open work already covers them." : "All synced ERP customers already have access, or the run completed without proposed changes."}</p>
                      </div>
                    )}

                    <div className="border">
                      <button type="button" className="flex w-full items-center justify-between gap-1.5 px-3 py-2 text-left text-xs font-medium hover:bg-muted" onClick={() => setShowAudit((open) => !open)} aria-expanded={showAudit}>
                        <span className="flex items-center gap-1.5"><FileCheck2 className="h-3.5 w-3.5" /> Audit trail ({auditEvents.length})</span>
                        <span className="text-[11px] text-muted-foreground">{showAudit ? "Hide" : "Show"}</span>
                      </button>
                      {showAudit ? (
                        <div className="space-y-2 border-t p-2">
                          {auditEvents.length ? auditEvents.map((event) => (
                            <div key={event.id} className="border p-2 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className="font-medium text-[11px]">{statusLabel(event.event_type)}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                              </div>
                              {event.transcript ? <p className="mt-1 bg-muted/50 p-1.5 text-[10px]"><span className="font-medium">Transcript:</span> {event.transcript}</p> : null}
                              {Object.keys(event.metadata ?? {}).length ? (
                                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words bg-slate-950 p-1.5 text-[10px] text-slate-100">{JSON.stringify(event.metadata, null, 2)}</pre>
                              ) : null}
                              <p className="mt-1 text-[10px] text-muted-foreground">Actor {event.actor_user_id ?? "system"}{event.action_id ? ` · Action ${event.action_id}` : ""}</p>
                            </div>
                          )) : <p className="text-[11px] text-muted-foreground">No audit events have been recorded for this run yet.</p>}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            {[
              ...visibleConversationMessages.map((message) => ({
                id: message.id,
                role: message.role,
                text: message.content,
                files: message.attachments,
              })),
              ...localMessages,
            ].map((message) => (
              message.role === "user" ? (
                <div key={message.id} className="flex animate-fade-in justify-end">
                  <div className="max-w-[85%] space-y-1.5 bg-primary px-3 py-2 text-xs text-primary-foreground shadow-sm">
                    {message.text ? <CopilotMarkdown content={message.text} tone="user" /> : null}
                    {message.files?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {message.files.map((file) => (
                          file.kind === "image" && file.previewUrl ? (
                            <img key={file.name} src={file.previewUrl} alt={file.name} className="h-20 w-20 border border-primary-foreground/30 object-cover transition-transform duration-200 hover:scale-105" />
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
                <div key={message.id} className="group flex animate-fade-in gap-2">
                  <div className="mt-0.5 h-6 w-6 shrink-0 bg-slate-900 p-1 text-white shadow-sm"><Bot className="h-3.5 w-3.5 text-cyan-300" /></div>
                  <div className="min-w-0 flex-1 text-xs">
                    <CopilotMarkdown content={message.text ?? ""} />
                  </div>
                </div>
              )
            ))}

            {isAnalyzing ? (
              <div className="flex animate-fade-in items-center gap-2 text-xs text-muted-foreground">
                <div className="mt-0.5 h-6 w-6 shrink-0 bg-slate-900 p-1 text-white"><Bot className="h-3.5 w-3.5 animate-pulse text-cyan-300" /></div>
                <span className="flex items-center gap-1.5">
                  Reading your attachment
                  <ThinkingDots />
                </span>
              </div>
            ) : null}

            {prepareMutation.isPending ? (
              <div className="flex animate-fade-in items-center gap-2 text-xs text-muted-foreground">
                <div className="mt-0.5 h-6 w-6 shrink-0 bg-slate-900 p-1 text-white"><Bot className="h-3.5 w-3.5 animate-pulse text-cyan-300" /></div>
                <span className="flex items-center gap-1.5">
                  Working through the ERP customer layer
                  <ThinkingDots />
                </span>
              </div>
            ) : null}


            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="border-t bg-background">
          <div className="mx-auto w-full max-w-3xl space-y-3 px-4 py-4">
            {inputMode === "voice" ? (
              <div className={cn("border p-2 text-xs", lowConfidence ? "border-amber-300 bg-amber-50" : "border-sky-200 bg-sky-50")}>
                <div className="flex items-start gap-1.5">
                  {lowConfidence ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-amber-700" /> : <FileCheck2 className="mt-0.5 h-3.5 w-3.5 text-sky-700" />}
                  <div>
                    <p className="font-medium">Transcript review required</p>
                    <p className="text-[11px] text-muted-foreground">{lowConfidence ? "Recognition confidence was below your threshold. Correct any customer or lens terms before confirming." : "Edit any recognition errors, then confirm this is what you said."}</p>
                    <label className="mt-2 flex cursor-pointer items-center gap-1.5 font-medium">
                      <Checkbox checked={transcriptConfirmed} onCheckedChange={(checked) => setTranscriptConfirmed(checked === true)} className="h-3 w-3" />
                      <span className="text-[11px]">I reviewed this transcript</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : null}

            {attachments.length ? (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((file) => (
                  <div key={file.id} className="flex items-center gap-1.5 border px-2 py-1 text-[11px]">
                    {file.kind === "image" && file.previewUrl ? (
                      <img src={file.previewUrl} alt="" className="h-6 w-6 object-cover" />
                    ) : (
                      <FileText className="h-3 w-3" />
                    )}
                    <span className="max-w-[10rem] truncate">{file.name}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*,application/pdf,text/*,.csv"
              onChange={(event) => {
                void addFiles(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />

            <div className="rounded-2xl border border-input bg-muted/30 shadow-sm transition-colors focus-within:border-foreground/30 focus-within:bg-background focus-within:shadow-md">
              <div className="flex items-end gap-2 px-4 pt-3.5">
                <Textarea
                  aria-label="Message the Copilot"
                  value={command}
                  onChange={(event) => {
                    setCommand(event.target.value);
                    if (inputMode === "voice") setTranscriptConfirmed(false);
                  }}
                  onPaste={(event) => {
                    const files = Array.from(event.clipboardData.files ?? []);
                    if (files.length) {
                      event.preventDefault();
                      void addFiles(files);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  rows={1}
                  className="max-h-40 min-h-[2.75rem] flex-1 resize-none border-0 bg-transparent p-0 text-base leading-6 shadow-none focus-visible:ring-0"
                  placeholder={attachments.length ? "Add a note about this file (optional) and press Enter" : `Message Copilot — e.g. "${DEFAULT_COMMAND}"`}
                />
                <Button
                  type="button"
                  size="icon"
                  className="mb-0.5 h-8 w-8 shrink-0 rounded-lg"
                  aria-label={attachments.length ? "Analyse attachment" : "Send message"}
                  disabled={!canPrepare}
                  onClick={submit}
                >
                  {prepareMutation.isPending || isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-1.5 px-2.5 pb-2.5 pt-1.5">
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                    aria-label="Attach a prescription or order file"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <div className="flex items-center overflow-hidden rounded-full border border-transparent hover:border-input">
                    <Button
                      type="button"
                      size="icon"
                      variant={speech.isListening ? "destructive" : "ghost"}
                      className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground data-[state=listening]:text-foreground"
                      aria-label={speech.isStarting ? "Starting microphone" : speech.isTranscribing ? "Transcribing recording" : holdToRecord ? "Hold to talk, then release to review the transcript" : "Click to start or stop recording"}
                      disabled={speech.isStarting || speech.isTranscribing}
                      onPointerDown={(event) => {
                        if (!holdToRecord) return;
                        event.preventDefault();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        void speech.start();
                      }}
                      onPointerUp={() => holdToRecord && speech.stop()}
                      onPointerCancel={() => holdToRecord && speech.stop()}
                      onKeyDown={(event) => {
                        if (!holdToRecord) return;
                        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
                          event.preventDefault();
                          void speech.start();
                        }
                      }}
                      onKeyUp={(event) => {
                        if (!holdToRecord) return;
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          speech.stop();
                        }
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        if (holdToRecord) return;
                        if (speech.isListening) speech.stop();
                        else void speech.start();
                      }}
                    >
                      {speech.isStarting || speech.isTranscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-6 rounded-full text-muted-foreground hover:text-foreground" aria-label="Microphone settings">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72">
                        <DropdownMenuLabel className="px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Microphone</DropdownMenuLabel>
                        <div className="max-h-64 overflow-y-auto">
                          <DropdownMenuItem
                            className="flex items-center justify-between gap-2"
                            onSelect={() => speech.setSettings((current) => ({ ...current, deviceId: "default" }))}
                          >
                            <span className="truncate">System default</span>
                            {speech.settings.deviceId === "default" ? <Check className="h-4 w-4 shrink-0" /> : null}
                          </DropdownMenuItem>
                          {speech.devices.filter((device) => device.deviceId && device.deviceId !== "default").map((device, index) => (
                            <DropdownMenuItem
                              key={device.deviceId}
                              className="flex items-center justify-between gap-2"
                              onSelect={() => speech.setSettings((current) => ({ ...current, deviceId: device.deviceId }))}
                            >
                              <span className="truncate">{device.label || `Microphone ${index + 1}`}</span>
                              {speech.settings.deviceId === device.deviceId ? <Check className="h-4 w-4 shrink-0" /> : null}
                            </DropdownMenuItem>
                          ))}
                        </div>
                        <DropdownMenuSeparator />
                        <div className="flex items-center justify-between px-2 py-1 text-[11px]">
                          <Label htmlFor="hold-to-record" className="cursor-pointer font-normal">Hold to record</Label>
                          <Switch id="hold-to-record" checked={holdToRecord} onCheckedChange={setHoldToRecord} />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setShowAudioSettings(true)}>
                          <Settings2 className="mr-1.5 h-3 w-3" /> More voice settings
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {speech.isListening ? (
                    <div className="ml-1 h-1 w-12 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-cyan-500 transition-[width]" style={{ width: `${speech.level}%` }} />
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {speech.isTranscribing ? <span>Transcribing…</span> : null}
                  <span className="hidden truncate sm:inline">{speech.activeDeviceLabel}</span>
                  <span className="hidden lg:inline">Enter to send · Shift+Enter for a new line</span>
                </div>
              </div>
            </div>
            {speech.error ? <p role="alert" className="text-sm text-red-700">{speech.error}</p> : null}

            {showAudioSettings ? (
              <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Select value={speech.settings.language} onValueChange={(language: "en-BB" | "en-US" | "en-GB") => speech.setSettings((current) => ({ ...current, language }))}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="en-BB">English (Caribbean)</SelectItem><SelectItem value="en-US">English (US)</SelectItem><SelectItem value="en-GB">English (UK)</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confidence-threshold" className="text-xs">Confidence threshold</Label>
                  <Input id="confidence-threshold" type="number" min={0} max={1} step={0.05} value={speech.settings.confidenceThreshold} onChange={(event) => speech.setSettings((current) => ({ ...current, confidenceThreshold: Math.min(1, Math.max(0, Number(event.target.value))) }))} className="h-7 text-xs" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="custom-vocabulary" className="text-xs">Customer and lens vocabulary</Label>
                  <Input id="custom-vocabulary" value={speech.settings.vocabulary} onChange={(event) => speech.setSettings((current) => ({ ...current, vocabulary: event.target.value }))} className="h-7 text-xs" />
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
