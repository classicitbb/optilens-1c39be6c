import { useEffect, useState } from "react";
import { SpellCheck, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { tidyText, type TidyKind, type TidyResult } from "@/lib/textTidy";

type TidySuggestionChipProps = {
  value: string;
  /** Receives the complete tidied (or restored) value for the field. */
  onApply: (nextValue: string) => void;
  kind?: TidyKind;
  /** Positioning from the caller, e.g. absolute inside a field wrapper. */
  className?: string;
  /** Quiet period after the last keystroke before the check runs. */
  delayMs?: number;
};

const CHIP_CLASS =
  "inline-flex h-6 items-center gap-1 rounded-full border border-border bg-background px-2 text-[11px] font-medium text-muted-foreground shadow-sm transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const describeFixes = (result: TidyResult) =>
  result.fixes.map((fix) => (fix.count > 1 ? `${fix.label} ×${fix.count}` : fix.label)).join(", ");

/**
 * Offers to tidy a field's spacing, capitalisation and punctuation a few seconds
 * after typing stops. It never edits on its own: nothing appears unless there is
 * something to fix, clicking applies it, and Undo restores the typed text.
 */
const TidySuggestionChip = ({ value, onApply, kind = "sentence", className, delayMs = 3000 }: TidySuggestionChipProps) => {
  const [suggestion, setSuggestion] = useState<{ for: string; result: TidyResult } | null>(null);
  const [undo, setUndo] = useState<{ before: string; after: string } | null>(null);
  // A value the user chose to restore; don't offer to tidy that exact text again.
  const [declined, setDeclined] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const result = tidyText(value, kind);
      setSuggestion(result.total > 0 ? { for: value, result } : null);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [value, kind, delayMs]);

  // Any edit since the check ran makes the suggestion stale, so it is hidden at once.
  const active = suggestion && suggestion.for === value && value !== declined ? suggestion.result : null;

  if (active) {
    const summary = describeFixes(active);
    return (
      <button
        type="button"
        className={cn(CHIP_CLASS, className)}
        title={summary}
        aria-label={`Tidy up: ${summary}`}
        onClick={() => {
          setUndo({ before: value, after: active.text });
          onApply(active.text);
        }}
      >
        <SpellCheck className="h-3 w-3" />
        Tidy up · {active.total} {active.total === 1 ? "fix" : "fixes"}
      </button>
    );
  }

  if (undo && undo.after === value) {
    return (
      <button
        type="button"
        className={cn(CHIP_CLASS, className)}
        onClick={() => {
          setDeclined(undo.before);
          setUndo(null);
          onApply(undo.before);
        }}
      >
        <Undo2 className="h-3 w-3" />
        Undo tidy
      </button>
    );
  }

  return null;
};

export default TidySuggestionChip;
