import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const UnsavedChangesDialog = ({ open, onSave, onDiscard, onCancel }: Props) => (
  <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
    <AlertDialogContent style={{ borderRadius: "4px" }}>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-sm">Unsaved Changes</AlertDialogTitle>
        <AlertDialogDescription className="text-xs">
          You have unsaved changes. Would you like to save before navigating?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="gap-2">
        <AlertDialogCancel className="h-7 text-xs" onClick={onCancel}>Cancel</AlertDialogCancel>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onDiscard}>Discard</Button>
        <AlertDialogAction className="h-7 text-xs" style={{ background: "hsl(215 65% 50%)", borderRadius: "4px" }} onClick={onSave}>Save</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default UnsavedChangesDialog;
