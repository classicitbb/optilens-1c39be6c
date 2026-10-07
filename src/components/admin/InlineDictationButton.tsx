import { useCallback, useEffect, useRef } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

type InlineDictationButtonProps = {
  ariaLabel: string;
  /** Receives the complete next value for the field the button sits in. */
  onValueChange: (nextValue: string) => void;
  vocabulary: string;
  /** Where the button sits in the field: `top` for tall fields, `center` for one-line inputs. */
  position?: "top" | "bottom" | "center";
  /** Show a live speech meter and status while recording. */
  showLevelMeter?: boolean;
  /** Drop the full stop transcription adds to a sentence, for titles and other short phrases. */
  trimTrailingPeriod?: boolean;
};

// Matches the speech threshold usePushToTalk uses to decide the speaker is active.
const SPEECH_LEVEL = 4;
const BAR_WEIGHTS = [0.35, 0.7, 1, 0.55, 0.85];

const BUTTON_POSITION = {
  top: "right-1 top-1",
  bottom: "bottom-1 right-1",
  center: "right-0.5 top-0",
} as const;

const METER_POSITION = {
  top: "right-10 top-1.5",
  bottom: "bottom-1.5 right-10",
  center: "right-10 top-1",
} as const;

const needsLeadingSpace = (before: string) => before.length > 0 && !/\s$/.test(before);
const needsTrailingSpace = (after: string) => after.length > 0 && !/^\s/.test(after);

/**
 * Compact record/stop control for ordinary form fields. A completed
 * transcription is inserted at the caret (or after the previously dictated
 * text) instead of replacing or blindly appending to the field.
 */
const InlineDictationButton = ({
  ariaLabel,
  onValueChange,
  vocabulary,
  position = "top",
  showLevelMeter = false,
  trimTrailingPeriod = false,
}: InlineDictationButtonProps) => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const caretKnownRef = useRef(false);

  useEffect(() => {
    const container = anchorRef.current?.parentElement;
    const field = container?.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea") ?? null;
    fieldRef.current = field;
    if (!field) return;
    const markCaret = () => {
      caretKnownRef.current = true;
    };
    field.addEventListener("focus", markCaret);
    field.addEventListener("click", markCaret);
    field.addEventListener("keyup", markCaret);
    return () => {
      field.removeEventListener("focus", markCaret);
      field.removeEventListener("click", markCaret);
      field.removeEventListener("keyup", markCaret);
    };
  }, []);

  const insertTranscript = useCallback((rawTranscript: string) => {
    const transcript = trimTrailingPeriod ? rawTranscript.replace(/\.$/, "") : rawTranscript;
    const field = fieldRef.current;
    if (!field) {
      onValueChange(transcript);
      return;
    }
    const value = field.value ?? "";
    const hasCaret = caretKnownRef.current && field.selectionStart != null;
    const start = hasCaret ? (field.selectionStart ?? value.length) : value.length;
    const end = hasCaret ? (field.selectionEnd ?? start) : value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const insertion = `${needsLeadingSpace(before) ? " " : ""}${transcript}${needsTrailingSpace(after) ? " " : ""}`;
    const nextValue = `${before}${insertion}${after}`;
    const caret = before.length + insertion.length;
    onValueChange(nextValue);
    caretKnownRef.current = true;
    window.requestAnimationFrame(() => {
      try {
        field.setSelectionRange(caret, caret);
      } catch {
        /* field type may not support selection */
      }
    });
  }, [onValueChange, trimTrailingPeriod]);

  const speech = usePushToTalk(insertTranscript, { vocabulary });
  const isBusy = speech.isStarting || speech.isTranscribing;
  const speechDetected = speech.level >= SPEECH_LEVEL;

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      {showLevelMeter && (speech.isListening || speech.isTranscribing) ? (
        <div
          role="status"
          className={cn(
            "pointer-events-none absolute z-10 flex h-7 items-center gap-2 rounded-full border border-border bg-background px-2.5 text-[11px] font-medium",
            METER_POSITION[position],
            speech.isListening && speechDetected ? "text-rose-500" : "text-muted-foreground",
          )}
        >
          {speech.isListening ? (
            <>
              <span className="flex h-3.5 items-end gap-[2px]" aria-hidden="true">
                {BAR_WEIGHTS.map((weight, index) => (
                  <span
                    key={index}
                    className={cn("w-[3px] rounded-full transition-[height] duration-100", speechDetected ? "bg-rose-500" : "bg-muted-foreground/50")}
                    style={{ height: `${Math.max(2, Math.min(14, (speech.level / 100) * 14 * weight + 2))}px` }}
                  />
                ))}
              </span>
              {speechDetected ? "Speech detected" : "Listening…"}
            </>
          ) : (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcribing…
            </>
          )}
        </div>
      ) : null}
      <Button
        type="button"
        size="icon"
        variant={speech.isListening ? "destructive" : "ghost"}
        className={cn("absolute z-10 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground", BUTTON_POSITION[position])}
        aria-label={speech.isListening ? "Stop dictation and transcribe" : ariaLabel}
        title={speech.isListening ? "Stop recording and transcribe" : "Record and transcribe"}
        disabled={isBusy}
        onClick={() => {
          if (speech.isListening) {
            speech.stop();
          } else {
            void speech.start();
          }
        }}
      >
        {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : speech.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
      {speech.error ? <p role="alert" className="sr-only">{speech.error}</p> : null}
    </>
  );
};

export default InlineDictationButton;
