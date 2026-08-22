import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNpsFeedback, type NpsTriggerContext } from "@/hooks/useNpsFeedback";

interface NpsPromptProps {
  triggerContext: NpsTriggerContext;
  /** Order id, ticket id, etc. Omit for a general, always-askable prompt. */
  sourceId?: string | null;
  /** Human-readable context stored alongside the response, e.g. "Order CV-2026-01234". */
  sourceLabel?: string | null;
  title?: string;
  className?: string;
}

const SCORES = Array.from({ length: 11 }, (_, i) => i);

const NpsPrompt = ({
  triggerContext,
  sourceId,
  sourceLabel,
  title = "How likely are you to recommend Classic Visions to a colleague?",
  className,
}: NpsPromptProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasResponded, isChecking, submitNps, isSubmitting } = useNpsFeedback({ triggerContext, sourceId });
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [justSubmittedScore, setJustSubmittedScore] = useState<number | null>(null);

  // Anonymous visitors, or prompts still checking prior-response state, render nothing.
  if (!user || isChecking || dismissed) return null;
  if (hasResponded && justSubmittedScore === null) return null;

  if (justSubmittedScore !== null) {
    return (
      <div className={cn("rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm", className)}>
        <div className="flex items-center gap-2 text-secondary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span className="font-medium">Thanks for the feedback!</span>
        </div>
        <p className="mt-1 text-muted-foreground">
          {justSubmittedScore <= 6
            ? "We're sorry it wasn't a 10 — a member of our team may follow up to see how we can do better."
            : "We really appreciate you taking the time to let us know."}
        </p>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (selectedScore === null) return;
    try {
      await submitNps({
        score: selectedScore,
        comment,
        triggerContext,
        sourceId,
        sourceLabel,
      });
      setJustSubmittedScore(selectedScore);
    } catch (err) {
      toast({
        title: "Couldn't submit feedback",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn("rounded-lg border border-border bg-card px-4 py-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <Star className="h-4 w-4 text-secondary" />
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => setSelectedScore(score)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors",
              selectedScore === score
                ? "border-secondary bg-secondary text-secondary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-secondary/50 hover:text-foreground",
            )}
            aria-pressed={selectedScore === score}
            aria-label={`Score ${score}`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mb-3 flex justify-between text-[11px] text-muted-foreground">
        <span>Not likely</span>
        <span>Extremely likely</span>
      </div>

      {selectedScore !== null && (
        <Textarea
          placeholder="Anything you'd like to add? (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="mb-3 min-h-[60px] text-sm"
        />
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSubmit} disabled={selectedScore === null || isSubmitting}>
          Submit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)} disabled={isSubmitting}>
          Not now
        </Button>
      </div>
    </div>
  );
};

export default NpsPrompt;
