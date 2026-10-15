import { MessageSquarePlus, ClipboardList, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminRole } from "@/contexts/AdminRoleContext";

import { ANNOTATE_UI_ATTR } from "./annotator";
import { useAnnotator } from "./useAnnotator";

const UI = { [ANNOTATE_UI_ATTR]: "" };

/** Header pencil: annotate the current page. Administrators only (not while impersonating another role). */
export default function AnnotateMenu() {
  const { isAdmin } = useAdminRole();
  const { annotator, isActive, count } = useAnnotator(isAdmin);

  if (!isAdmin) return null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Annotate this page"
              aria-pressed={isActive}
              {...UI}
            >
              <Pencil
                className={`h-3.5 w-3.5 ${isActive ? "text-primary" : "text-[hsl(var(--admin-muted-fg))]"}`}
              />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">Annotate (A)</span>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56" {...UI}>
        <DropdownMenuItem onSelect={() => annotator?.toggle()}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          {isActive ? "Stop annotating" : "Annotate this page"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => annotator?.openReview()}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Review &amp; export ({count})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
