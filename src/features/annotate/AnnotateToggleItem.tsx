import { Check, Pencil } from "lucide-react";

import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

import type { Annotator } from "./annotator";

/**
 * Profile-menu pencil. Starts annotating; while annotating it is a check that finishes and opens
 * the review dialog (copy markdown). The annotator itself lives in the caller, which stays mounted
 * while this menu is closed.
 */
export default function AnnotateToggleItem({ annotator, isActive }: { annotator: Annotator | null; isActive: boolean }) {
  const label = isActive ? "Finish annotating and copy notes" : "Annotate this page";
  const Icon = isActive ? Check : Pencil;

  return (
    <DropdownMenuItem
      aria-label={label}
      title={label}
      disabled={!annotator}
      onSelect={() => {
        if (!annotator) return;
        if (isActive) {
          annotator.setActive(false);
          annotator.openReview();
        } else {
          annotator.setActive(true);
        }
      }}
      className="h-9 w-9 shrink-0 justify-center rounded-md p-0"
    >
      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
    </DropdownMenuItem>
  );
}
