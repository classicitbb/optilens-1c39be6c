import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { CornerDownLeft, FileText, Loader2, Mic, Plus, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import type { CopilotAttachment } from "@/features/admin/copilot/api";
import type { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";
import { useAutoGrowTextarea } from "@/features/admin/copilot/useAutoGrowTextarea";
import { VoiceSettingsMenu } from "@/features/admin/copilot/VoiceSettingsMenu";
import { cn } from "@/lib/utils";

const METER_DOTS = 18;
const SILENT_METER = Array.from({ length: METER_DOTS }, () => 0);

type CopilotComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  canSend: boolean;
  isSending: boolean;
  /** Locks typing, attaching and recording while a request is in flight. */
  disabled?: boolean;
  placeholder: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Runs before the built-in Enter-to-send; call preventDefault() to take over a key. */
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  attachments: CopilotAttachment[];
  maxAttachments: number;
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
  speech: ReturnType<typeof usePushToTalk>;
  holdToRecord: boolean;
  onHoldToRecordChange: (next: boolean) => void;
  /** Unique per surface — the widget and the console can both be mounted. */
  switchId: string;
  showAdvancedVoice?: boolean;
  /** Notices that sit above the input (transcription status, low confidence). */
  banner?: ReactNode;
  /** Extra controls just before the send and mic buttons. */
  trailing?: ReactNode;
};

const iconButton = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white";

/**
 * The Copilot message box, shared by the floating widget and the full console.
 * Plus on the left, the microphone on the right. Right-click the microphone for
 * the device list; while recording it turns blue, shows a level meter, and the
 * browser's live transcript appears in the box.
 */
export const CopilotComposer = ({
  value,
  onChange,
  onSubmit,
  canSend,
  isSending,
  disabled = false,
  placeholder,
  textareaRef,
  onKeyDown,
  attachments,
  maxAttachments,
  onAddFiles,
  onRemoveAttachment,
  speech,
  holdToRecord,
  onHoldToRecordChange,
  switchId,
  showAdvancedVoice,
  banner,
  trailing,
}: CopilotComposerProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [samples, setSamples] = useState(SILENT_METER);

  const listening = speech.isListening;
  const preview = speech.interim ?? "";
  const shown = listening && preview ? (value ? `${value}\n${preview}` : preview) : value;
  useAutoGrowTextarea(textareaRef, shown);

  useEffect(() => {
    if (!listening) return undefined;
    return () => setSamples(SILENT_METER);
  }, [listening]);

  useEffect(() => {
    if (listening) setSamples((current) => [...current.slice(1), speech.level]);
  }, [listening, speech.level]);

  const micBusy = speech.isStarting || speech.isTranscribing;
  const micLabel = micBusy
    ? "Working on the recording"
    : holdToRecord
      ? "Hold to talk, then release to review the transcript"
      : listening
        ? "Stop recording"
        : "Start recording";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white text-slate-900 shadow-sm transition-colors",
        "border-slate-300/80 focus-within:border-slate-400 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-100 dark:focus-within:border-white/25",
        listening && "border-blue-500/50 focus-within:border-blue-500/50 dark:border-blue-400/40 dark:focus-within:border-blue-400/40",
      )}
    >
      {banner}

      {attachments.length ? (
        <div className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-1.5 pr-2 text-xs text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
            >
              {file.kind === "image" && file.previewUrl ? (
                <img src={file.previewUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-zinc-300">
                  <FileText className="h-4 w-4" />
                </span>
              )}
              <span className="max-w-[10rem] truncate font-medium">{file.name}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                className="ml-0.5 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => onRemoveAttachment(file.id)}
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
          onAddFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      <div className="flex items-end gap-1 p-2">
        <button
          type="button"
          aria-label="Attach a file"
          title="Attach a file (images, PDF, CSV, audio)"
          disabled={disabled || attachments.length >= maxAttachments}
          className={iconButton}
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="h-[18px] w-[18px]" />
        </button>

        <Textarea
          ref={textareaRef}
          dir="ltr"
          aria-label="Message the Copilot"
          value={shown}
          readOnly={listening}
          disabled={disabled}
          rows={1}
          onChange={(event) => onChange(event.target.value)}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData?.files ?? []);
            if (!files.length) return;
            event.preventDefault();
            onAddFiles(files);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented) return;
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={listening ? "Listening… speak now" : placeholder}
          className={cn(
            "min-h-0 w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-left text-[14px] leading-6 shadow-none",
            "text-slate-900 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-zinc-100 dark:placeholder:text-zinc-500",
            listening && "italic text-slate-500 dark:text-zinc-400",
          )}
        />

        {trailing}

        {listening ? (
          <span className="flex h-8 shrink-0 items-center gap-[3px] px-1.5" role="img" aria-label="Microphone level">
            {samples.map((sample, index) => (
              <span
                key={index}
                className="w-[3px] rounded-full bg-blue-500 transition-[height,opacity] duration-100 dark:bg-blue-400"
                style={{
                  height: `${Math.round(3 + Math.min(sample, 60) * 0.3)}px`,
                  opacity: sample > 3 ? 1 : 0.35,
                }}
              />
            ))}
          </span>
        ) : speech.isTranscribing ? (
          <span className="flex h-8 shrink-0 items-center gap-1.5 px-1 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            Transcribing
          </span>
        ) : null}

        {canSend || isSending ? (
          <button
            type="button"
            aria-label={attachments.length ? "Analyse attachment" : "Send message"}
            title="Send (Enter)"
            disabled={!canSend}
            className={iconButton}
            onClick={onSubmit}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-[18px] w-[18px]" />}
          </button>
        ) : null}

        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={micLabel}
            title={`${holdToRecord ? "Hold to talk" : listening ? "Stop recording" : "Record"} · ${speech.activeDeviceLabel} · right-click to choose a microphone`}
            disabled={disabled || micBusy}
            className={cn(
              iconButton,
              listening && "bg-blue-500/15 text-blue-600 hover:bg-blue-500/25 hover:text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30 dark:hover:text-blue-300",
            )}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenuOpen(true);
            }}
            onPointerDown={(event) => {
              if (!holdToRecord || event.button !== 0) return;
              event.preventDefault();
              event.currentTarget.setPointerCapture(event.pointerId);
              void speech.start();
            }}
            onPointerUp={(event) => {
              if (holdToRecord && event.button === 0) speech.stop();
            }}
            onPointerCancel={() => holdToRecord && speech.stop()}
            onKeyDown={(event) => {
              if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
                event.preventDefault();
                setMenuOpen(true);
                return;
              }
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
              if (listening) speech.stop();
              else void speech.start();
            }}
          >
            {micBusy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Mic className="h-[18px] w-[18px]" />}
          </button>
          <VoiceSettingsMenu
            speech={speech}
            holdToRecord={holdToRecord}
            onHoldToRecordChange={onHoldToRecordChange}
            showAdvanced={showAdvancedVoice}
            switchId={switchId}
            align="end"
            open={menuOpen}
            onOpenChange={setMenuOpen}
          >
            {/* The menu opens from a right-click on the microphone, so its trigger is only an anchor. */}
            <span aria-hidden className="pointer-events-none absolute inset-0" />
          </VoiceSettingsMenu>
        </div>
      </div>
    </div>
  );
};

export default CopilotComposer;
