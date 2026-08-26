import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushToTalk } from "@/features/admin/copilot/usePushToTalk";

type InlineDictationButtonProps = {
  ariaLabel: string;
  onTranscript: (transcript: string) => void;
  vocabulary: string;
};

/**
 * Compact record/stop control for ordinary form fields. A completed
 * transcription is delivered straight to the owning field; submitting the
 * form remains a separate, deliberate action.
 */
const InlineDictationButton = ({ ariaLabel, onTranscript, vocabulary }: InlineDictationButtonProps) => {
  const speech = usePushToTalk((transcript) => onTranscript(transcript), { vocabulary });
  const isBusy = speech.isStarting || speech.isTranscribing;

  return (
    <>
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
