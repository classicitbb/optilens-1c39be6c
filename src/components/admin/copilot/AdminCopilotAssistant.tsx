import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Mic,
  MicOff,
  MessageSquarePlus,
  Paperclip,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ActionCard } from "@/features/admin/copilot/ActionCard";
import { ThinkingDots } from "@/features/admin/copilot/ThinkingDots";
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, buildAttachment } from "@/features/admin/copilot/attachments";
import { getContextLabel, pathnameToContextSlug } from "@/lib/adminContexts";

const SUGGESTIONS = [
  "Explain what I'm looking at on this screen",
  "Scan CRM for lapsed buyers and qualified follow-up opportunities",
  "Roll out portal access to all ERP customers",
];

type LocalMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  files?: { name: string; kind: CopilotAttachment["kind"]; previewUrl?: string }[];
};

const createId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const MAX_COMMAND_INPUT_LINES = 4;

/**
 * Admin-only floating Copilot. Structurally modeled on the public
 * CompanionAssistant widget's shell (same card/composer/launcher look), but
 * it is a separate component with its own state — it talks to the
 * portal-copilot Edge Function, never the public assistant's engine.
 */
const AdminCopilotAssistant = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const contextSlug = useMemo(() => pathnameToContextSlug(location.pathname), [location.pathname]);
  const contextLabel = useMemo(() => getContextLabel(contextSlug), [contextSlug]);

  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false);
  const [state, setState] = useState<CopilotState | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [holdToRecord, setHoldToRecord] = useState(readStoredHoldToRecord);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);

  const onTranscript = useCallback((transcript: string) => {
    setCommand(transcript);
    setInputMode("voice");
    setTranscriptConfirmed(true);
  }, []);
  const speech = usePushToTalk(onTranscript);

  const changeHoldToRecord = useCallback((next: boolean) => {
    setHoldToRecord(next);
    storeHoldToRecord(next);
  }, []);

  const stateQuery = useQuery({
    queryKey: ["admin-copilot-widget-state", selectedConversationId ?? "latest", selectedRunId ?? "latest"],
    queryFn: () => loadCopilotState(selectedConversationId, selectedRunId),
    enabled: isOpen,
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
      pageContext: contextSlug,
    }),
    onSuccess: (next) => {
      acceptState(next);
      setCommand("");
      setInputMode("text");
      setTranscriptConfirmed(false);
    },
    onError: (error: Error) => toast({ title: "Copilot could not respond", description: error.message, variant: "destructive" }),
  });

  const newConversationMutation = useMutation({
    mutationFn: createCopilotConversation,
    onSuccess: (next) => {
      acceptState(next);
      setCommand("");
      setInputMode("text");
      setTranscriptConfirmed(false);
      setAttachments([]);
      setLocalMessages([]);
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

  const hasAttachments = attachments.length > 0;
  const canSend = !prepareMutation.isPending && !isAnalyzing
    && (hasAttachments || command.trim().length > 0);

  useEffect(() => {
    if (!isOpen) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isOpen, conversationMessages.length, localMessages.length, pendingActions.length, prepareMutation.isPending, isAnalyzing]);

  const resizeCommandInput = useCallback(() => {
    const el = commandInputRef.current;
    if (!el) return;
    el.style.height = "auto";
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 16;
    const maxHeight = lineHeight * MAX_COMMAND_INPUT_LINES + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
    const nextHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${nextHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    resizeCommandInput();
  }, [command, resizeCommandInput]);

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

  const analyzeAttachments = async () => {
    const pending = attachments;
    const text = command.trim();
    setLocalMessages((current) => [...current, {
      id: createId("user"),
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
      setLocalMessages((current) => [...current, { id: createId("assistant"), role: "assistant", text: messageText }]);
      toast({ title: "Could not read the attachment", description: messageText, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submit = () => {
    if (!canSend) return;
    if (hasAttachments) {
      void analyzeAttachments();
      return;
    }
    prepareMutation.mutate();
  };

  const startNewConversation = () => newConversationMutation.mutate();

  const openFullConsole = () => {
    setIsOpen(false);
    navigate("/admin/copilot");
  };

  return (
    <>
      {!isOpen ? (
        <Button
          type="button"
          size="icon"
          aria-label="Open Iris, Portal Copilot"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full border border-accent/70 bg-background/75 text-foreground shadow-[0_16px_42px_rgba(200,145,48,0.16),inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-xl hover:bg-background/90 sm:bottom-6 sm:right-6"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-x-3 bottom-20 top-20 z-50 sm:inset-x-auto sm:right-4 sm:top-28 sm:bottom-8 sm:w-[28rem]">
          <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#c9a227]/65 bg-card/95 shadow-[0_10px_40px_-10px_hsl(213_66%_13%/0.15),0_30px_80px_-20px_rgba(2,6,23,0.45)] backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80 text-primary shadow-soft">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">Iris — Portal Copilot</p>
                  <p className="truncate text-[11px] leading-tight text-foreground/50">
                    Watching <span className="font-medium text-foreground/70">{contextLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground/60 hover:text-foreground"
                  aria-label="New chat"
                  title="New chat"
                  onClick={startNewConversation}
                  disabled={newConversationMutation.isPending || prepareMutation.isPending}
                >
                  {newConversationMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground/60 hover:text-foreground"
                  aria-label="Open the full Copilot console"
                  title="Open the full console"
                  onClick={openFullConsole}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 shrink-0 rounded-full border border-border/50 bg-card/80 text-foreground/70 shadow-soft hover:bg-muted hover:text-foreground"
                  aria-label="Close Copilot"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3 pb-2">
                {stateQuery.isError && !state ? (
                  <div className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-950">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>Copilot backend is not available in this environment.</p>
                  </div>
                ) : null}

                {!selectedRun && !conversationMessages.length && !localMessages.length ? (
                  <div className="space-y-3">
                    <div className="rounded-[20px] border border-border/50 bg-muted/30 px-4 py-3 text-sm leading-6 text-foreground">
                      I can look things up, explain what you're working on, and prepare governed ERP/CRM actions for your approval. Ask a question, or try one of these:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-full border border-border/50 bg-card/80 px-3 py-1.5 text-xs text-secondary shadow-soft hover:bg-muted"
                          onClick={() => { setCommand(suggestion); setInputMode("text"); }}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedRun ? (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-[20px] rounded-br-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft">{selectedRun.command_text}</div>
                    </div>
                    <div className="flex gap-2">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80 text-primary shadow-soft">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        {selectedRun.workflow === "crm_opportunity_scan" ? (
                          <p className="text-sm leading-6 text-foreground">
                            Reviewed <strong>{selectedRun.summary.contactsReviewed ?? 0}</strong> pipeline contacts and <strong>{selectedRun.summary.orderSignalsReviewed ?? 0}</strong> order-health records. <strong>{selectedRun.summary.suggestionsPrepared ?? 0}</strong> qualified follow-ups are ready for review.
                          </p>
                        ) : (
                          <p className="text-sm leading-6 text-foreground">
                            Reviewed <strong>{selectedRun.summary.erpCustomers ?? 0}</strong> ERP customers. <strong>{selectedRun.summary.invitationsReady ?? 0}</strong> invitations are drafted and waiting for approval, <strong>{selectedRun.summary.followUpsNeeded ?? 0}</strong> need a follow-up first.
                          </p>
                        )}
                        {pendingActions.length ? pendingActions.map((action) => (
                          <ActionCard
                            key={`${action.id}:${action.updated_at}`}
                            action={action}
                            busy={busyActionId === action.id}
                            onDecide={(selected, decision) => decideMutation.mutate({ action: selected, decision })}
                            onSave={(selected, draft) => editMutation.mutate({ action: selected, draft })}
                          />
                        )) : (
                          <div className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Nothing needs approval for this run.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}

                {[
                  ...visibleConversationMessages.map((message) => ({ id: message.id, role: message.role, text: message.content, files: message.attachments })),
                  ...localMessages,
                ].map((message) => (
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] space-y-1.5 rounded-[20px] rounded-br-lg bg-primary px-4 py-3 text-sm text-primary-foreground shadow-soft">
                        {message.text ? <CopilotMarkdown content={message.text} tone="user" /> : null}
                        {message.files?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {message.files.map((file) => (
                              file.kind === "image" && file.previewUrl ? (
                                <img key={file.name} src={file.previewUrl} alt={file.name} className="h-16 w-16 rounded-[14px] border border-primary-foreground/25 object-cover" />
                              ) : (
                                <span key={file.name} className="flex items-center gap-1 rounded-full border border-primary-foreground/30 px-2 py-1 text-xs"><FileText className="h-3 w-3" /> {file.name}</span>
                              )
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex gap-2">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80 text-primary shadow-soft">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1"><CopilotMarkdown content={message.text ?? ""} /></div>
                    </div>
                  )
                ))}

                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80 text-primary shadow-soft"><Sparkles className="h-3.5 w-3.5 animate-pulse" /></div>
                    <span className="flex items-center gap-1.5">Reading your attachment <ThinkingDots /></span>
                  </div>
                ) : null}

                {prepareMutation.isPending ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-card/80 text-primary shadow-soft"><Sparkles className="h-3.5 w-3.5 animate-pulse" /></div>
                    <span className="flex items-center gap-1.5">Working on it <ThinkingDots /></span>
                  </div>
                ) : null}

                <div ref={scrollAnchorRef} />
              </div>
            </div>

            <div className="border-t border-border/50 bg-muted/30 px-3 py-2">
              {attachments.length ? (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1 text-[11px]">
                      {file.kind === "image" && file.previewUrl ? (
                        <img src={file.previewUrl} alt="" className="h-6 w-6 rounded object-cover" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span className="max-w-[8rem] truncate">{file.name}</span>
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

              <div className="rounded-[22px] border border-accent/55 bg-card/90 p-0.5 shadow-[0_0_0_1px_hsl(var(--accent)/0.10),0_8px_24px_-14px_hsl(var(--accent)/0.55)] backdrop-blur-md focus-within:border-accent focus-within:shadow-[0_0_0_3px_hsl(var(--accent)/0.16),0_8px_24px_-14px_hsl(var(--accent)/0.65)]">
                <div className="flex items-end gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full text-foreground/50 hover:text-foreground"
                    aria-label="Attach a file"
                    title="Attach a file"
                    disabled={prepareMutation.isPending || isAnalyzing || attachments.length >= MAX_ATTACHMENTS}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <div className="flex shrink-0 items-center overflow-hidden rounded-full border border-transparent hover:border-input">
                    <Button
                      type="button"
                      size="icon"
                      variant={speech.isListening ? "destructive" : "ghost"}
                      className="h-9 w-9 shrink-0 rounded-full text-foreground/50 hover:text-foreground"
                      aria-label={speech.isListening ? "Stop recording and transcribe" : speech.isStarting ? "Starting microphone" : speech.isTranscribing ? "Transcribing" : holdToRecord ? "Hold to talk, then release to review the transcript" : "Start recording"}
                      title={speech.isListening ? "Click to stop and transcribe" : speech.isStarting ? "Starting microphone…" : speech.isTranscribing ? "Transcribing…" : `Click to record — ${speech.activeDeviceLabel}`}
                      disabled={prepareMutation.isPending || isAnalyzing || speech.isStarting || speech.isTranscribing}
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
                        if (speech.isListening) {
                          speech.stop();
                        } else {
                          void speech.start();
                        }
                      }}
                    >
                      {speech.isStarting || speech.isTranscribing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : speech.isListening ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                    <VoiceSettingsMenu
                      speech={speech}
                      holdToRecord={holdToRecord}
                      onHoldToRecordChange={changeHoldToRecord}
                      switchId="widget-hold-to-record"
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-5 shrink-0 rounded-full px-0 text-foreground/50 hover:text-foreground"
                        aria-label="Microphone and voice settings"
                        title="Choose a microphone"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </VoiceSettingsMenu>
                  </div>
                  {speech.isListening ? (
                    <div className="mb-3 h-1 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-cyan-500 transition-[width]" style={{ width: `${speech.level}%` }} />
                    </div>
                  ) : null}
                  <Textarea
                    ref={commandInputRef}
                    dir="ltr"
                    rows={1}
                    value={command}
                    onChange={(event) => {
                      setCommand(event.target.value);
                      if (inputMode === "voice") setTranscriptConfirmed(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    onPaste={(event) => {
                      const files = Array.from(event.clipboardData?.files ?? []);
                      if (files.length) {
                        event.preventDefault();
                        void addFiles(files);
                      }
                    }}
                    placeholder={attachments.length ? "Add a note (optional) and press Enter" : "Ask anything, or click the mic to speak"}
                    disabled={prepareMutation.isPending || isAnalyzing}
                    className="min-h-0 resize-none border-0 bg-transparent px-2 py-2.5 text-left text-[12px] leading-[16px] text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full"
                    aria-label={attachments.length ? "Analyze attachment" : "Send message"}
                    disabled={!canSend}
                    onClick={submit}
                  >
                    {prepareMutation.isPending || isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {speech.error ? <p role="alert" className="mt-1.5 text-[11px] text-red-700">{speech.error}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AdminCopilotAssistant;
