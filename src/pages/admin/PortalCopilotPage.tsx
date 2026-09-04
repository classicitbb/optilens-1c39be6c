import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  Bot,
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
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { VoiceSettingsMenu } from "@/features/admin/copilot/VoiceSettingsMenu";
import { readStoredHoldToRecord, storeHoldToRecord } from "@/features/admin/copilot/voicePreferences";
import { CopilotMarkdown } from "@/features/admin/copilot/CopilotMarkdown";
import { ActionCard, statusLabel } from "@/features/admin/copilot/ActionCard";
import { ThinkingDots } from "@/features/admin/copilot/ThinkingDots";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, buildAttachment, toBase64 } from "@/features/admin/copilot/attachments";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { formatVoiceTranscript } from "@/features/admin/copilot/transcriptFormatting";

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

const PortalCopilotPage = ({ standalone }: { standalone?: boolean }) => {
  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [holdToRecord, setHoldToRecord] = useState(readStoredHoldToRecord);
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
  const [isTranscribingFile, setIsTranscribingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);

  const transcribeAudioFile = useCallback(async (file: File) => {
    setIsTranscribingFile(true);
    try {
      const data = await toBase64(file);
      const { data: response, error } = await supabase.functions.invoke("voice-transcribe", {
        body: { audio: data, mimeType: file.type || "audio/webm" },
      });
      if (error) throw error;
      const payload = response as { transcript?: string } | null;
      const transcript = formatVoiceTranscript(String(payload?.transcript ?? ""));
      if (!transcript) {
        toast({ title: "Nothing recognised", description: `Could not transcribe ${file.name}.`, variant: "destructive" });
        return;
      }
      setCommand((current) => (current.trim() ? `${current}\n${transcript}` : transcript));
      setInputMode("voice");
      setTranscriptConfirmed(false);
    } catch (error) {
      toast({ title: "Transcription failed", description: error instanceof Error ? error.message : `Could not transcribe ${file.name}.`, variant: "destructive" });
    } finally {
      setIsTranscribingFile(false);
    }
  }, [toast]);

  const addFiles = useCallback(async (files: File[]) => {
    const usable = files.filter((file) => {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        toast({ title: "File too large", description: `${file.name} is over 8MB.`, variant: "destructive" });
        return false;
      }
      return true;
    });
    if (!usable.length) return;
    const audioFiles = usable.filter((file) => file.type.startsWith("audio/"));
    const otherFiles = usable.filter((file) => !file.type.startsWith("audio/"));
    for (const audioFile of audioFiles) {
      await transcribeAudioFile(audioFile);
    }
    if (!otherFiles.length) return;
    const built = await Promise.all(otherFiles.map(buildAttachment));
    setAttachments((current) => [...current, ...built].slice(0, MAX_ATTACHMENTS));
  }, [toast, transcribeAudioFile]);


  const onTranscript = useCallback((transcript: string, confidence: number) => {
    setCommand(transcript);
    setInputMode("voice");
    setTranscriptConfirmed(false);
    setSpeechConfidence(confidence);
  }, []);
  const speech = usePushToTalk(onTranscript);

  const changeHoldToRecord = useCallback((next: boolean) => {
    setHoldToRecord(next);
    storeHoldToRecord(next);
  }, []);

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

  useEffect(() => {
    if (command) return;
    if (commandInputRef.current) commandInputRef.current.style.height = "auto";
  }, [command]);

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
      className={cn(
        "relative flex w-full overflow-hidden border-t bg-background",
        standalone ? "h-full min-h-0" : "h-[calc(100vh-4rem)]",
      )}
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
          <p className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" /> Drop a file to attach it, or an audio file to transcribe it</p>
        </div>
      ) : null}
      {showSidebar ? (
        <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/30 lg:flex">
          <div className="flex items-center justify-between gap-1.5 border-b px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold"><Bot className="h-3.5 w-3.5 text-cyan-600" /> Iris — Portal Copilot</span>
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
          {standalone ? (
            <Button size="icon" variant="ghost" aria-label="Back to admin" className="h-7 w-7" asChild>
              <a href="/admin/dashboard"><ArrowLeft className="h-3.5 w-3.5" /></a>
            </Button>
          ) : null}
          {!showSidebar ? (
            <Button size="icon" variant="ghost" aria-label="Show chat history" className="hidden h-7 w-7 lg:inline-flex" onClick={() => setShowSidebar(true)}><PanelLeftOpen className="h-3.5 w-3.5" /></Button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-xs font-semibold">{selectedConversation?.title ?? "Iris — Portal Copilot"}</h1>
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
                        {message.files.map((file, fileIndex) => (
                          file.kind === "image" && file.previewUrl ? (
                            <img key={`${file.name}:${fileIndex}`} src={file.previewUrl} alt={file.name} className="h-20 w-20 border border-primary-foreground/30 object-cover transition-transform duration-200 hover:scale-105" />
                          ) : (
                            <span key={`${file.name}:${fileIndex}`} className="flex items-center gap-1 border border-primary-foreground/30 px-2 py-1 text-xs">
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

        <div className="relative shrink-0 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90">
          <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-6 sm:px-6">
            <div className="group relative">
              {/* Glow behind the composer */}
              <div aria-hidden className="pointer-events-none absolute -inset-1 rounded-[30px] bg-gradient-to-r from-violet-500/25 via-fuchsia-500/20 to-cyan-500/25 opacity-0 blur-xl transition-opacity duration-500 group-focus-within:opacity-100" />

              <div
                className={cn(
                  "composer relative overflow-hidden rounded-[26px] border bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.18)] transition-all duration-300",
                  "border-slate-200/80 focus-within:border-violet-400/70 focus-within:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_0_0_4px_rgba(139,92,246,0.14),0_18px_44px_-14px_rgba(15,23,42,0.28)]",
                  "dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.8)] dark:focus-within:border-violet-400/50",
                  speech.isListening && "border-rose-400/70 focus-within:border-rose-400/70",
                )}
              >
                {/* Status strips: transcription / transcript review */}
                {isTranscribingFile ? (
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-zinc-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                    Transcribing audio file…
                  </div>
                ) : null}

                {inputMode === "voice" ? (
                  <div
                    className={cn(
                      "flex items-start gap-3 border-b px-4 py-2.5 text-xs",
                      lowConfidence
                        ? "border-amber-200/70 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200"
                        : "border-violet-200/70 bg-violet-50 text-violet-900 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200",
                    )}
                  >
                    {lowConfidence ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <FileCheck2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">Review your transcript</p>
                      <p className="mt-0.5 opacity-80">
                        {lowConfidence
                          ? "Recognition confidence was below your threshold. Check customer and lens terms before sending."
                          : "Fix any recognition errors, then confirm this is what you said."}
                      </p>
                    </div>
                    <label className="flex shrink-0 cursor-pointer items-center gap-1.5 self-center rounded-full border border-current/20 bg-white/60 px-2.5 py-1 font-medium dark:bg-black/20">
                      <Checkbox checked={transcriptConfirmed} onCheckedChange={(checked) => setTranscriptConfirmed(checked === true)} className="h-3.5 w-3.5 rounded-[4px]" />
                      Reviewed
                    </label>
                  </div>
                ) : null}

                {/* Attachment chips */}
                {attachments.length ? (
                  <div className="flex flex-wrap gap-2 px-4 pt-3.5">
                    {attachments.map((file) => (
                      <div
                        key={file.id}
                        className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                      >
                        {file.kind === "image" && file.previewUrl ? (
                          <img src={file.previewUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                            <FileText className="h-4 w-4" />
                          </span>
                        )}
                        <span className="max-w-[11rem] truncate font-medium">{file.name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          className="ml-0.5 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                          onClick={() => setAttachments((current) => current.filter((item) => item.id !== file.id))}
                        >
                          <X className="h-3.5 w-3.5" />
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
                  accept="image/*,application/pdf,text/*,.csv,audio/*"
                  onChange={(event) => {
                    void addFiles(Array.from(event.target.files ?? []));
                    event.target.value = "";
                  }}
                />

                {/* Text input */}
                <div className="px-5 pt-4">
                  <Textarea
                    ref={commandInputRef}
                    aria-label="Message the Copilot"
                    value={command}
                    onChange={(event) => {
                      setCommand(event.target.value);
                      if (inputMode === "voice") setTranscriptConfirmed(false);
                      const el = event.currentTarget;
                      el.style.height = "auto";
                      const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 24;
                      el.style.height = `${Math.min(el.scrollHeight, lineHeight * 8)}px`;
                    }}
                    onPaste={(event) => {
                      const files = Array.from(event.clipboardData.files ?? []);
                      if (files.length) {
                        event.preventDefault();
                        void addFiles(files);
                        return;
                      }
                      requestAnimationFrame(() => {
                        const el = commandInputRef.current;
                        if (!el) return;
                        el.style.height = "auto";
                        const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight) || 24;
                        el.style.height = `${Math.min(el.scrollHeight, lineHeight * 8)}px`;
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    rows={1}
                    className="min-h-[1.5rem] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[15px] leading-6 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    placeholder={
                      speech.isListening
                        ? "Listening… speak now"
                        : attachments.length
                          ? "Add a note about this file (optional)"
                          : "Ask the Copilot anything — orders, customers, CRM, rollouts…"
                    }
                  />
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Attach a file"
                      title="Attach a file (images, PDF, CSV, audio)"
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-[18px] w-[18px]" />
                    </button>

                    <span
                      className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 sm:inline-flex"
                      title="Copilot can read and propose changes across every admin module. Customer-facing effects always wait for your approval."
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Full access
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {speech.isListening ? (
                      <div className="mr-1 flex items-center gap-2 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                        </span>
                        <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                          {[0.35, 0.7, 1, 0.55, 0.85].map((weight, index) => (
                            <span
                              key={index}
                              className="w-[3px] rounded-full bg-rose-500 transition-[height] duration-100"
                              style={{ height: `${Math.max(2, Math.min(12, (speech.level / 100) * 12 * weight + 2))}px` }}
                            />
                          ))}
                        </span>
                        Recording
                      </div>
                    ) : speech.isTranscribing ? (
                      <span className="mr-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                        <Loader2 className="h-3 w-3 animate-spin" /> Transcribing
                      </span>
                    ) : null}

                    <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/5">
                      <button
                        type="button"
                        aria-label={speech.isStarting ? "Starting microphone" : speech.isTranscribing ? "Transcribing recording" : holdToRecord ? "Hold to talk, then release to review the transcript" : speech.isListening ? "Stop recording" : "Start recording"}
                        title={holdToRecord ? "Hold to talk" : speech.isListening ? "Stop recording" : `Record — ${speech.activeDeviceLabel}`}
                        disabled={speech.isStarting || speech.isTranscribing}
                        className={cn(
                          "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition disabled:opacity-50",
                          speech.isListening
                            ? "bg-rose-500 text-white shadow-[0_0_0_3px_rgba(244,63,94,0.2)] hover:bg-rose-600"
                            : "text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white",
                        )}
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
                        {speech.isStarting || speech.isTranscribing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : speech.isListening ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">{speech.isListening ? "Stop" : holdToRecord ? "Hold" : "Voice"}</span>
                      </button>
                      <VoiceSettingsMenu
                        speech={speech}
                        holdToRecord={holdToRecord}
                        onHoldToRecordChange={changeHoldToRecord}
                        showAdvanced
                        switchId="console-hold-to-record"
                        align="end"
                      >
                        <button
                          type="button"
                          aria-label="Voice and microphone settings"
                          title="Microphone and voice settings"
                          className="flex h-8 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      </VoiceSettingsMenu>
                    </div>

                    <button
                      type="button"
                      aria-label={attachments.length ? "Analyse attachment" : "Send message"}
                      title={canPrepare ? "Send (Enter)" : inputMode === "voice" && !transcriptConfirmed ? "Confirm the transcript first" : "Type a message to send"}
                      disabled={!canPrepare}
                      className={cn(
                        "ml-0.5 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                        canPrepare
                          ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,0.7)] hover:scale-105 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95"
                          : "bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-zinc-500",
                      )}
                      onClick={submit}
                    >
                      {prepareMutation.isPending || isAnalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : canPrepare ? (
                        <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
                      ) : (
                        <Square className="h-3 w-3 fill-current" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {speech.error ? (
              <p role="alert" className="mt-2 flex items-center gap-1.5 px-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" /> {speech.error}
              </p>
            ) : null}

            <p className="mt-2.5 text-center text-[11px] text-slate-400 dark:text-zinc-500">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans dark:border-white/10 dark:bg-white/5">Enter</kbd> to send · <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans dark:border-white/10 dark:bg-white/5">Shift+Enter</kbd> for a new line · drop files or audio anywhere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalCopilotPage;
