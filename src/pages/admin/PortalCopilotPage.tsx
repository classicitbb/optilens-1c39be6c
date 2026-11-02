import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CopilotComposer } from "@/features/admin/copilot/CopilotComposer";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";
import { readStoredHoldToRecord, storeHoldToRecord } from "@/features/admin/copilot/voicePreferences";
import { CopilotMarkdown } from "@/features/admin/copilot/CopilotMarkdown";
import { suggestFollowUps } from "@/features/admin/copilot/followUpSuggestions";
import { ActionCard, statusLabel } from "@/features/admin/copilot/ActionCard";
import { ThinkingDots } from "@/features/admin/copilot/ThinkingDots";
import { CopyMessageButton } from "@/features/admin/copilot/CopyMessageButton";
import { useStickToBottom } from "@/features/admin/copilot/useStickToBottom";
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
      setTranscriptConfirmed(true);
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
    setTranscriptConfirmed(true);
    setSpeechConfidence(confidence);
    commandInputRef.current?.focus();
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
  const followUpSuggestions = useMemo(() => suggestFollowUps(displayedState), [displayedState]);

  const canPrepare = !prepareMutation.isPending && !isAnalyzing
    && (hasAttachments || command.trim().length > 0);
  const auditEvents = displayedState?.auditEvents ?? [];
  const lastSentMessage = useMemo(
    () => [...conversationMessages].reverse().find((message) => message.role === "user")?.content ?? "",
    [conversationMessages],
  );

  const { containerRef: threadRef, isAtBottom, onScroll: onThreadScroll, scrollToBottom } = useStickToBottom(
    `${selectedConversation?.id}:${selectedRun?.id}:${visibleActions.length}:${followUpSuggestions.length}:${prepareMutation.isPending}:${conversationMessages.length}:${localMessages.length}:${isAnalyzing}`,
  );

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

        <div className="relative min-h-0 flex-1">
        <div
          ref={threadRef}
          onScroll={onThreadScroll}
          role="log"
          aria-live="polite"
          aria-label="Conversation"
          className="h-full overflow-y-auto"
        >
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
                        commandInputRef.current?.focus();
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
                    {selectedRun.workflow === "helpdesk_ticket" ? (
                      <p className="text-xs leading-5">
                        I opened helpdesk ticket <strong>{selectedRun.summary.ticketNumber ?? ""}</strong> in the queue. No email was sent to anyone.
                      </p>
                    ) : selectedRun.workflow === "crm_opportunity_scan" ? (
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
                    {message.text ? (
                      <div className="mt-1 flex opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <CopyMessageButton text={message.text} />
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            ))}

            {isAnalyzing ? (
              <div role="status" className="flex animate-fade-in items-center gap-2 text-xs text-muted-foreground">
                <div className="mt-0.5 h-6 w-6 shrink-0 bg-slate-900 p-1 text-white"><Bot className="h-3.5 w-3.5 animate-pulse text-cyan-300" /></div>
                <span className="flex items-center gap-1.5">
                  Reading your attachment
                  <ThinkingDots />
                </span>
              </div>
            ) : null}

            {prepareMutation.isPending ? (
              <div role="status" className="flex animate-fade-in items-center gap-2 text-xs text-muted-foreground">
                <div className="mt-0.5 h-6 w-6 shrink-0 bg-slate-900 p-1 text-white"><Bot className="h-3.5 w-3.5 animate-pulse text-cyan-300" /></div>
                <span className="flex items-center gap-1.5">
                  Working through the ERP customer layer
                  <ThinkingDots />
                </span>
              </div>
            ) : null}


            {followUpSuggestions.length > 0 && !prepareMutation.isPending && !isAnalyzing ? (
              <div className="flex flex-wrap gap-1.5 pl-8">
                {followUpSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    type="button"
                    className="border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                    onClick={() => {
                      setCommand(suggestion.prompt);
                      setInputMode("text");
                      commandInputRef.current?.focus();
                    }}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            ) : null}

          </div>
        </div>
        {!isAtBottom ? (
          <button
            type="button"
            aria-label="Jump to latest message"
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-md transition hover:bg-muted"
            onClick={() => scrollToBottom()}
          >
            <ArrowDown className="h-3.5 w-3.5" /> Jump to latest
          </button>
        ) : null}
        </div>

        <div className="relative shrink-0 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90">
          <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-6 sm:px-6">
            <CopilotComposer
              value={command}
              onChange={setCommand}
              onSubmit={submit}
              canSend={canPrepare}
              isSending={prepareMutation.isPending || isAnalyzing}
              placeholder={attachments.length ? "Add a note about this file (optional)" : "Ask the Copilot anything — orders, customers, CRM, rollouts…"}
              textareaRef={commandInputRef}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" && !command && lastSentMessage) {
                  event.preventDefault();
                  setCommand(lastSentMessage);
                }
              }}
              attachments={attachments}
              maxAttachments={MAX_ATTACHMENTS}
              onAddFiles={(files) => void addFiles(files)}
              onRemoveAttachment={(id) => setAttachments((current) => current.filter((item) => item.id !== id))}
              speech={speech}
              holdToRecord={holdToRecord}
              onHoldToRecordChange={changeHoldToRecord}
              showAdvancedVoice
              switchId="console-hold-to-record"
              banner={
                <>
                  {isTranscribingFile ? (
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-white/5 dark:bg-white/[0.03] dark:text-zinc-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Transcribing audio file…
                    </div>
                  ) : null}
                  {lowConfidence ? (
                    <div role="status" className="flex items-start gap-3 border-b border-amber-200/70 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p className="min-w-0 flex-1">
                        <span className="font-semibold">Check your transcript.</span> Recognition confidence was below your threshold, so review customer and lens terms before sending.
                      </p>
                    </div>
                  ) : null}
                </>
              }
              trailing={
                <span
                  className="hidden h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 sm:inline-flex"
                  title="Copilot can read and propose changes across every admin module. Customer-facing effects always wait for your approval."
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Full access
                </span>
              }
            />

            {speech.error ? (
              <p role="alert" className="mt-2 flex items-center gap-1.5 px-2 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" /> {speech.error}
              </p>
            ) : null}

            <p className="mt-2.5 text-center text-[11px] text-slate-400 dark:text-zinc-500">
              <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans dark:border-white/10 dark:bg-white/5">Enter</kbd> to send · <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans dark:border-white/10 dark:bg-white/5">Shift+Enter</kbd> for a new line · <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans dark:border-white/10 dark:bg-white/5">↑</kbd> to recall your last message · drop files or audio anywhere
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalCopilotPage;
