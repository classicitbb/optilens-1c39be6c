import { useState } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useHelpFeedback } from "@/hooks/useHelpFeedback";
import { useToast } from "@/hooks/use-toast";
import { useAdminRoleSafe } from "@/contexts/AdminRoleContext";

type FeedbackComposerMode = "suggestion" | "not_helpful" | null;

interface Props {
  articleId: string;
  pageSlug?: string;
  articleTitle?: string;
  articleContent?: string;
  articleContextSlugs?: string[];
  onEdit?: (articleId: string) => void;
}

const HelpFeedbackButtons = ({ articleId, pageSlug, articleTitle, articleContent, articleContextSlugs, onEdit }: Props) => {
  const [composerMode, setComposerMode] = useState<FeedbackComposerMode>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const { submitFeedback, isSubmitting } = useHelpFeedback();
  const { toast } = useToast();
  const { canEdit } = useAdminRoleSafe();

  const clearComposer = () => {
    setComposerMode(null);
    setFeedbackText("");
  };

  const handleFeedback = async (type: "helpful" | "not_helpful" | "suggestion") => {
    try {
      await submitFeedback({
        articleId,
        feedbackType: type,
        suggestionText: type === "helpful" ? undefined : feedbackText,
        pageSlug,
        articleTitle,
        articleContent,
        articleContextSlugs,
      });
      setSubmitted(type);
      clearComposer();
      toast({ title: "Thanks for your feedback!" });
    } catch (err: any) {
      const msg = err?.message?.includes("only supported for database")
        ? "Feedback not available for built-in articles"
        : "Error submitting feedback";
      toast({ title: msg, variant: "destructive" });
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
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium" style={{ color: "hsl(215 20% 45%)" }}>Was this helpful?</p>
        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Edit this article"
            onClick={() => onEdit(articleId)}
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </Button>
        )}
      </div>
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
          onClick={() => {
            setComposerMode(composerMode === "not_helpful" ? null : "not_helpful");
            setFeedbackText("");
          }}
          disabled={isSubmitting}
        >
          <ThumbsDown className="h-3 w-3 shrink-0" /> Not Helpful
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 px-2"
          onClick={() => {
            setComposerMode(composerMode === "suggestion" ? null : "suggestion");
            setFeedbackText("");
          }}
          disabled={isSubmitting}
        >
          <MessageSquare className="h-3 w-3 shrink-0" /> Suggest
        </Button>
      </div>
      {composerMode && (
        <div className="space-y-2">
          <Textarea
            placeholder={composerMode === "not_helpful" ? "What was missing or unclear?" : "How can we improve this article?"}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="text-xs min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleFeedback(composerMode)}
              disabled={isSubmitting || !feedbackText.trim()}
            >
              {composerMode === "not_helpful" ? "Submit for Review" : "Submit Suggestion"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={clearComposer}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpFeedbackButtons;
