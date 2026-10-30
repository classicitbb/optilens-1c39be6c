import { CircleHelp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TOOLTIPS, type TooltipId } from "./tooltips";

interface HelpTipProps {
  id: TooltipId;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
}

/** A small "?" that explains the field or button next to it. Text lives in src/help/tooltips. */
const HelpTip = ({ id, side = "top", className }: HelpTipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="What is this?"
        data-help-tip={id}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground align-middle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
      >
        <CircleHelp className="h-3.5 w-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side={side} className="max-w-xs text-xs leading-relaxed">
      {TOOLTIPS[id]}
    </TooltipContent>
  </Tooltip>
);

export default HelpTip;
