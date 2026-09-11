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

type PricelistAdjustmentSaveDialogProps = {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onPreserveManual: () => void;
  onReplaceAll: () => void;
};

export function PricelistAdjustmentSaveDialog({
  open,
  isPending,
  onOpenChange,
  onPreserveManual,
  onReplaceAll,
}: PricelistAdjustmentSaveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apply percentage changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Preserve manual prices keeps every operator-entered line price and only regenerates
            prices created by earlier bulk adjustments. Replace all line prices removes manual
            prices in the affected sections and cannot be undone from this screen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Back</AlertDialogCancel>
          <Button variant="destructive" disabled={isPending} onClick={onReplaceAll}>
            Replace all line prices
          </Button>
          <AlertDialogAction disabled={isPending} onClick={onPreserveManual}>
            Preserve manual prices
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
