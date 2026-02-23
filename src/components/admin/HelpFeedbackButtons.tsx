import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHelpFeedback } from "@/hooks/useHelpFeedback";
import { useToast } from "@/hooks/use-toast";

interface Props {
  articleId: string;
  pageSlug?: string;
}

const HelpFeedbackButtons = ({ articleId, pageSlug }: Props) => {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { submitFeedback, isSubmitting } = useHelpFeedback();
  const { toast } = useToast();

  const handleFeedback = async (type: "helpful" | "not_helpful" | "suggestion") => {
    try {
      await submitFeedback({
        articleId,
        feedbackType: type,
        suggestionText: type === "suggestion" ? suggestion : undefined,
        pageSlug,
      });
      setSubmitted(type);
      setShowSuggestion(false);
      setSuggestion("");
      toast({ title: "Thanks for your feedback!" });
    } catch {
      toast({ title: "Error submitting feedback", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-xs py-2" style={{ color: "hsl(140 45% 45%)" }}>
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>Feedback recorded — thank you!</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-3 border-t" style={{ borderColor: "hsl(215 15% 85%)" }}>
      <p className="text-[11px] font-medium" style={{ color: "hsl(215 20% 45%)" }}>Was this helpful?</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 px-2"
          onClick={() => handleFeedback("helpful")}
          disabled={isSubmitting}
        >
          <ThumbsUp className="h-3 w-3 shrink-0" /> Helpful
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 px-2"
          onClick={() => handleFeedback("not_helpful")}
          disabled={isSubmitting}
        >
          <ThumbsDown className="h-3 w-3 shrink-0" /> Not Helpful
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 px-2"
          onClick={() => setShowSuggestion(!showSuggestion)}
          disabled={isSubmitting}
        >
          <MessageSquare className="h-3 w-3 shrink-0" /> Suggest
        </Button>
      </div>
      {showSuggestion && (
        <div className="space-y-2">
          <Textarea
            placeholder="How can we improve this article?"
            value={suggestion}
            onChange={(e) => setSuggestion(e.target.value)}
            className="text-xs min-h-[60px]"
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            onClick={() => handleFeedback("suggestion")}
            disabled={isSubmitting || !suggestion.trim()}
          >
            Submit Suggestion
          </Button>
        </div>
      )}
    </div>
  );
};

export default HelpFeedbackButtons;
