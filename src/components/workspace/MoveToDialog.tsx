import { Command as CommandPrimitive } from "cmdk";
import { FileText, FolderOpen, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface MoveTarget {
  /** Article id, or `heading:<id>` for a section. */
  id: string;
  label: string;
  kind: "section" | "page";
}

interface MoveToDialogProps {
  open: boolean;
  pageTitle: string;
  targets: MoveTarget[];
  onOpenChange: (open: boolean) => void;
  onPick: (target: MoveTarget) => void;
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-2 text-[14px] text-ws-ink-2 data-[selected=true]:bg-ws-side-hover data-[selected=true]:text-ws-ink";

/** "Move to…": pick a section or a page to nest under. */
const MoveToDialog = ({ open, pageTitle, targets, onOpenChange, onPick }: MoveToDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="top-[20%] max-w-md translate-y-0 gap-0 overflow-hidden p-0">
      <DialogTitle className="sr-only">Move “{pageTitle}”</DialogTitle>
      <DialogDescription className="sr-only">Choose a section or page to move this page into.</DialogDescription>
      <CommandPrimitive loop className="flex max-h-[60vh] w-full flex-col overflow-hidden bg-ws-paper text-ws-ink">
        <div className="flex items-center gap-2 border-b border-ws-line px-3">
          <Search className="h-4 w-4 shrink-0 text-ws-ink-3" />
          <CommandPrimitive.Input
            placeholder={`Move “${pageTitle}” to…`}
            className="ws-bare-input h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-ws-ink-3"
          />
        </div>
        <CommandPrimitive.List className="min-h-0 flex-1 overflow-y-auto p-2">
          <CommandPrimitive.Empty className="px-2 py-6 text-center text-[14px] text-ws-ink-3">No matching pages.</CommandPrimitive.Empty>
          {targets.map((target) => (
            <CommandPrimitive.Item key={target.id} value={`${target.label} ${target.id}`} className={itemClass} onSelect={() => onPick(target)}>
              {target.kind === "section" ? <FolderOpen className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              <span className="truncate">{target.label}</span>
            </CommandPrimitive.Item>
          ))}
        </CommandPrimitive.List>
      </CommandPrimitive>
    </DialogContent>
  </Dialog>
);

export default MoveToDialog;
