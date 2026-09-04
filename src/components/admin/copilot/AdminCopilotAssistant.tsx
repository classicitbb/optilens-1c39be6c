import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Mic,
  MicOff,
  MessageSquarePlus,
  Paperclip,
  Square,
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
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_BYTES, buildAttachment, toBase64 } from "@/features/admin/copilot/attachments";
import { formatVoiceTranscript } from "@/features/admin/copilot/transcriptFormatting";
import { getContextLabel, pathnameToContextSlug } from "@/lib/adminContexts";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

const MAX_COMMAND_INPUT_LINES = 8;

const DEFAULT_WIDTH = 448; // 28rem
const DEFAULT_HEIGHT = 640;
const MIN_WIDTH = DEFAULT_WIDTH * 0.75;
const MIN_HEIGHT = DEFAULT_HEIGHT * 0.75;

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
  const [isTranscribingFile, setIsTranscribingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [holdToRecord, setHoldToRecord] = useState(readStoredHoldToRecord);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [panelPosition, setPanelPosition] = useState<{ x: number; y: number } | null>(null);
  const [panelSize, setPanelSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const dragRef = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const resizeRef = useRef<{ x: number; y: number; originW: number; originH: number } | null>(null);

  useEffect(() => {
    if (!isOpen || panelPosition || typeof window === "undefined" || window.innerWidth < 640) return;
    const height = Math.min(DEFAULT_HEIGHT, window.innerHeight - 112 - 32);
    setPanelSize({ width: DEFAULT_WIDTH, height });
    setPanelPosition({ x: window.innerWidth - DEFAULT_WIDTH - 16, y: 112 });
  }, [isOpen, panelPosition]);

  const beginDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panelPosition || window.innerWidth < 640 || (event.target as Element).closest("button,a,input,textarea")) return;
    dragRef.current = { x: event.clientX, y: event.clientY, originX: panelPosition.x, originY: panelPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [panelPosition]);

  const continueDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const nextX = dragRef.current.originX + event.clientX - dragRef.current.x;
    const nextY = dragRef.current.originY + event.clientY - dragRef.current.y;
    setPanelPosition({
      x: Math.max(0, Math.min(window.innerWidth - panelSize.width, nextX)),
      y: Math.max(0, Math.min(window.innerHeight - panelSize.height, nextY)),
    });
  }, [panelSize.width, panelSize.height]);

  const endDrag = useCallback(() => { dragRef.current = null; }, []);

  const beginResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!panelPosition) return;
    event.stopPropagation();
    resizeRef.current = { x: event.clientX, y: event.clientY, originW: panelSize.width, originH: panelSize.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [panelPosition, panelSize.width, panelSize.height]);

  const continueResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current || !panelPosition) return;
    event.stopPropagation();
    const nextW = resizeRef.current.originW + event.clientX - resizeRef.current.x;
    const nextH = resizeRef.current.originH + event.clientY - resizeRef.current.y;
    const maxW = Math.min(DEFAULT_WIDTH * 1.6, window.innerWidth - panelPosition.x - 8);
    const maxH = Math.min(DEFAULT_HEIGHT * 1.6, window.innerHeight - panelPosition.y - 8);
    setPanelSize({
      width: Math.max(MIN_WIDTH, Math.min(maxW, nextW)),
      height: Math.max(MIN_HEIGHT, Math.min(maxH, nextH)),
    });
  }, [panelPosition]);

  const endResize = useCallback(() => { resizeRef.current = null; }, []);

  const onTranscript = useCallback((transcript: string) => {
    setCommand((current) => (current.trim() ? `${current}\n${transcript}` : transcript));
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
      setSpeechConfidence(null);
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
      setSpeechConfidence(null);
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

  const lowConfidence = inputMode === "voice" && speechConfidence != null && speechConfidence < speech.settings.confidenceThreshold;
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
      setCommand((current) => (current.trim() ? `${current}
${transcript}` : transcript));
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
          className="fixed bottom-4 right-4 z-50 h-12 w-12 overflow-hidden rounded-full border border-accent/70 bg-background/75 p-0 text-foreground shadow-[0_16px_42px_rgba(200,145,48,0.16),inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-xl hover:bg-background/90 sm:bottom-6 sm:right-6"
        >
          <img src="/images/iris/iris-ai-operations-partner.png" alt="Iris, Portal Copilot" className="h-full w-full object-cover" />
        </Button>
      ) : null}

      {isOpen ? (
        <div
          className={
            panelPosition
              ? "fixed z-50"
              : "fixed inset-x-3 bottom-20 top-20 z-50 sm:inset-x-auto sm:right-4 sm:top-28 sm:bottom-8 sm:w-[28rem]"
          }
          style={panelPosition ? { left: panelPosition.x, top: panelPosition.y, width: panelSize.width, height: panelSize.height } : undefined}
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
          <div className="relative flex h-full flex-col overflow-hidden rounded-[42px] border border-[#c9a227]/65 bg-card/95 shadow-[0_10px_40px_-10px_hsl(213_66%_13%/0.15),0_30px_80px_-20px_rgba(2,6,23,0.45)] backdrop-blur-md">
            {isDragging ? (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-[42px] border-2 border-dashed border-cyan-500 bg-background/85 px-6 text-center">
                <p className="flex items-center gap-2 text-sm font-medium"><Paperclip className="h-4 w-4" /> Drop a file to attach it, or an audio file to transcribe it</p>
              </div>
            ) : null}
            <div
              className="flex touch-none items-center justify-between gap-2 border-b border-border/50 px-4 py-3 sm:cursor-move"
              onPointerDown={beginDrag}
              onPointerMove={continueDrag}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <img
                  src="/images/iris/iris-ai-operations-partner.png"
                  alt="Iris, Portal Copilot"
                  className="h-8 w-8 shrink-0 rounded-full border border-border/50 object-cover shadow-soft"
                />
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
                      <img
                        src="/images/iris/iris-ai-operations-partner.png"
                        alt="Iris"
                        className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border/50 object-cover shadow-soft"
                      />
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
                      <img
                        src="/images/iris/iris-ai-operations-partner.png"
                        alt="Iris"
                        className="mt-0.5 h-7 w-7 shrink-0 rounded-full border border-border/50 object-cover shadow-soft"
                      />
                      <div className="min-w-0 flex-1"><CopilotMarkdown content={message.text ?? ""} /></div>
                    </div>
                  )
                ))}

                {isAnalyzing ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <img src="/images/iris/iris-ai-operations-partner.png" alt="Iris" className="h-7 w-7 shrink-0 animate-pulse rounded-full border border-border/50 object-cover shadow-soft" />
                    <span className="flex items-center gap-1.5">Reading your attachment <ThinkingDots /></span>
                  </div>
                ) : null}

                {prepareMutation.isPending ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <img src="/images/iris/iris-ai-operations-partner.png" alt="Iris" className="h-7 w-7 shrink-0 animate-pulse rounded-full border border-border/50 object-cover shadow-soft" />
                    <span className="flex items-center gap-1.5">Working on it <ThinkingDots /></span>
                  </div>
                ) : null}

                <div ref={scrollAnchorRef} />
              </div>
            </div>

            <div className="border-t border-border/50 bg-muted/30 px-3 py-3">
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

                  {lowConfidence ? (
                    <div className="flex items-start gap-2.5 border-b border-amber-200/70 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">Low recognition confidence</p>
                        <p className="mt-0.5 opacity-80">Check customer and lens terms before sending.</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Attachment chips */}
                  {attachments.length ? (
                    <div className="flex flex-wrap gap-2 px-3.5 pt-3">
                      {attachments.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                        >
                          {file.kind === "image" && file.previewUrl ? (
                            <img src={file.previewUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                              <FileText className="h-4 w-4" />
                            </span>
                          )}
                          <span className="max-w-[8rem] truncate font-medium">{file.name}</span>
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
                  <div className="px-4 pt-3.5">
                    <Textarea
                      ref={commandInputRef}
                      dir="ltr"
                      aria-label="Message the Copilot"
                      value={command}
                      onChange={(event) => {
                        setCommand(event.target.value);
                        if (inputMode === "voice") setTranscriptConfirmed(true);
                      }}
                      onPaste={(event) => {
                        const files = Array.from(event.clipboardData?.files ?? []);
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
                      disabled={prepareMutation.isPending || isAnalyzing}
                      className="min-h-[1.5rem] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-left text-[14px] leading-6 text-slate-900 shadow-none placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      placeholder={
                        speech.isListening
                          ? "Listening… speak now"
                          : attachments.length
                            ? "Add a note about this file (optional)"
                            : "Ask anything, or drop a file here"
                      }
                    />
                  </div>

                  {/* Toolbar */}
                  <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5 pt-3">
                    <button
                      type="button"
                      aria-label="Attach a file"
                      title="Attach a file (images, PDF, CSV, audio)"
                      disabled={prepareMutation.isPending || isAnalyzing || attachments.length >= MAX_ATTACHMENTS}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="h-[18px] w-[18px]" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      {speech.isListening ? (
                        <div className="mr-0.5 flex items-center gap-2 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
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
                        </div>
                      ) : speech.isTranscribing ? (
                        <span className="mr-0.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Transcribing
                        </span>
                      ) : null}

                      <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/5">
                        <button
                          type="button"
                          aria-label={speech.isStarting ? "Starting microphone" : speech.isTranscribing ? "Transcribing recording" : holdToRecord ? "Hold to talk, then release to review the transcript" : speech.isListening ? "Stop recording" : "Start recording"}
                          title={holdToRecord ? "Hold to talk" : speech.isListening ? "Stop recording" : `Record — ${speech.activeDeviceLabel}`}
                          disabled={prepareMutation.isPending || isAnalyzing || speech.isStarting || speech.isTranscribing}
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
                          <span>{speech.isListening ? "Stop" : holdToRecord ? "Hold" : "Voice"}</span>
                        </button>
                        <VoiceSettingsMenu
                          speech={speech}
                          holdToRecord={holdToRecord}
                          onHoldToRecordChange={changeHoldToRecord}
                          switchId="widget-hold-to-record"
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
                        title={canSend ? "Send (Enter)" : "Type a message to send"}
                        disabled={!canSend}
                        className={cn(
                          "ml-0.5 flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200",
                          canSend
                            ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_6px_16px_-6px_rgba(139,92,246,0.7)] hover:scale-105 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95"
                            : "bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-zinc-500",
                        )}
                        onClick={submit}
                      >
                        {prepareMutation.isPending || isAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : canSend ? (
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
            </div>

            {panelPosition ? (
              <div
                role="separator"
                aria-label="Resize Copilot window"
                className="absolute bottom-1 right-1 hidden h-4 w-4 touch-none cursor-nwse-resize opacity-40 hover:opacity-80 sm:block"
                style={{ backgroundImage: "repeating-linear-gradient(135deg, hsl(var(--foreground)) 0 1px, transparent 1px 3px)" }}
                onPointerDown={beginResize}
                onPointerMove={continueResize}
                onPointerUp={endResize}
                onPointerCancel={endResize}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default AdminCopilotAssistant;
