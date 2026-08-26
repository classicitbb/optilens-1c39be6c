import { useCallback, useEffect, useRef } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

type InlineDictationButtonProps = {
  ariaLabel: string;
  /** Receives the complete next value for the field the button sits in. */
  onValueChange: (nextValue: string) => void;
  vocabulary: string;
};

const needsLeadingSpace = (before: string) => before.length > 0 && !/\s$/.test(before);
const needsTrailingSpace = (after: string) => after.length > 0 && !/^\s/.test(after);

/**
 * Compact record/stop control for ordinary form fields. A completed
 * transcription is inserted at the caret (or after the previously dictated
 * text) instead of replacing or blindly appending to the field.
 */
const InlineDictationButton = ({ ariaLabel, onValueChange, vocabulary }: InlineDictationButtonProps) => {
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

  const insertTranscript = useCallback((transcript: string) => {
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
  }, [onValueChange]);

  const speech = usePushToTalk(insertTranscript, { vocabulary });
  const isBusy = speech.isStarting || speech.isTranscribing;

  return (
    <>
      <span ref={anchorRef} className="hidden" aria-hidden="true" />
      <Button
        type="button"
        size="icon"
        variant={speech.isListening ? "destructive" : "ghost"}
        className="absolute right-1 top-1 z-10 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
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
